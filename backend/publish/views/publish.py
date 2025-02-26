from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication

from ..serializers import PublishReportSerializer, ReportSerializer
from ..models import PublishedReport
from notes.models import Note
from ..strategies import PUBLISH_STRATEGIES
from ..models import UploadStrategies, DownloadStrategies
from ..tasks import generate_report


class PublishReportAPIView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        upload_strategies = [
            {"label": choice.label, "strategy": choice.value}
            for choice in UploadStrategies
        ]
        download_strategies = [
            {"label": choice.label, "strategy": choice.value}
            for choice in DownloadStrategies
        ]
        return Response({"upload": upload_strategies, "download": download_strategies})

    def post(self, request):
        serializer = PublishReportSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        data = serializer.validated_data

        note_ids = data["note_ids"]
        title = data["title"]
        strategy_key = data["strategy"]

        user = request.user

        notes = Note.objects.filter(id__in=note_ids)
        if notes.count() != len(note_ids):
            return Response(
                {"detail": "One or more notes not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        for note in notes:
            if not note.publishable:
                return Response(
                    {"detail": f"Note {note.id} is not publishable."},
                    status=status.HTTP_403_FORBIDDEN,
                )

        publisher_factory = PUBLISH_STRATEGIES.get(strategy_key)
        if publisher_factory is None:
            return Response(
                {"detail": "Strategy not found."}, status=status.HTTP_404_NOT_FOUND
            )

        report = PublishedReport.objects.create(
            title=title,
            user=user,
            strategy=strategy_key,
        )
        report.notes.set(notes)
        report.save()
        report.notes.set(notes)
        report.log_create(user)

        generate_report.delay(report.id)

        return Response(ReportSerializer(report).data, status=status.HTTP_201_CREATED)
