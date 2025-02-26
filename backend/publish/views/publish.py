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

        # Fetch and validate notes.
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

        # Lookup publisher from registry
        publisher_factory = PUBLISH_STRATEGIES.get(strategy_key)
        if publisher_factory is None:
            return Response(
                {"detail": "Strategy not found."}, status=status.HTTP_404_NOT_FOUND
            )

        publisher = publisher_factory()
        published_post_id = publisher.publish(title, list(notes), user)
        if isinstance(published_post_id, str):
            # An error message was returned from the strategy.
            return Response(
                {"detail": published_post_id},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # Create the PublishedReport record.
        report = PublishedReport.objects.create(
            user=user,
            strategy=strategy_key,
            report_location=published_post_id,
        )
        report.notes.set(notes)
        report.save()

        return Response(ReportSerializer(report).data, status=status.HTTP_201_CREATED)
