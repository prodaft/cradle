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

from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiParameter


@extend_schema_view(
    get=extend_schema(
        summary="Get publish strategies",
        description="Returns available upload and download strategies for publishing reports.",
        responses={
            200: {
                "type": "object",
                "properties": {
                    "upload": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "label": {"type": "string"},
                                "strategy": {"type": "string"}
                            }
                        }
                    },
                    "download": {
                        "type": "array", 
                        "items": {
                            "type": "object",
                            "properties": {
                                "label": {"type": "string"},
                                "strategy": {"type": "string"}
                            }
                        }
                    }
                }
            },
            401: {"description": "User is not authenticated"}
        }
    ),
    post=extend_schema(
        summary="Create published report",
        description="Creates a new published report from selected notes using specified strategy.",
        request=PublishReportSerializer,
        responses={
            200: ReportSerializer,
            400: {"description": "Invalid request data"},
            401: {"description": "User is not authenticated"},
            403: {"description": "Note is not publishable"},
            404: {
                "description": "One or more notes not found or strategy not found"
            }
        }
    )
)

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
        anonymized = data["anonymized"]

        user = request.user

        notes = Note.objects.filter(publishable=True, id__in=note_ids)
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

        report.anonymized = anonymized
        report.save()
        report.notes.set(notes)
        report.log_create(user)

        generate_report.delay(report.id)

        return Response(ReportSerializer(report).data, status=status.HTTP_201_CREATED)
