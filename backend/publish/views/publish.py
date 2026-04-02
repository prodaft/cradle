from django.db import transaction
from django.urls import reverse
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from core.openapi import get_common_error_responses, get_error_responses
from notes.models import Note
from user.authentication import APIKeyAuthentication

from ..exceptions import (
    ExportFormatNotFoundException,
    NotesNotFoundException,
    PublishErrorCodes,
)
from ..models import DownloadStrategies, PublishedReport, UploadStrategies
from ..serializers import (
    PublishReportSerializer,
    PublishStrategiesResponseSerializer,
    ReportListSerializer,
)
from ..strategies import PUBLISH_STRATEGIES
from ..tasks import generate_report


@extend_schema_view(
    get=extend_schema(
        operation_id="reports_publish_retrieve",
        summary="Get publish strategies",
        description="Returns available upload and download strategies for publishing reports.",  # noqa: E501
        responses={
            200: PublishStrategiesResponseSerializer,
            **get_common_error_responses(),
        },
    ),
    post=extend_schema(
        operation_id="reports_publish_create",
        summary="Create published report",
        description="Creates a new published report from selected notes using specified strategy.",  # noqa: E501
        request=PublishReportSerializer,
        responses={
            201: ReportListSerializer,
            **get_error_responses(
                PublishErrorCodes.NOTES_NOT_FOUND,
                PublishErrorCodes.EXPORT_FORMAT_NOT_FOUND,
                include_validation_error=True,
            ),
            **get_common_error_responses(),
        },
    ),
)
class PublishReportAPIView(APIView):
    """List publish strategies (GET) or create a new published report (POST)."""

    authentication_classes = [JWTAuthentication, APIKeyAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        """Return available upload and download strategies."""
        upload_strategies = [{"label": choice.label, "strategy": choice.value} for choice in UploadStrategies]
        download_strategies = [{"label": choice.label, "strategy": choice.value} for choice in DownloadStrategies]
        return Response({"upload": upload_strategies, "download": download_strategies}, status=status.HTTP_200_OK)

    def post(self, request: Request) -> Response:
        """Create a report from selected notes and enqueue generation task."""
        serializer = PublishReportSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        note_ids = data["note_ids"]
        title = data["title"]
        strategy_key = data["strategy"]
        anonymized = data["anonymized"]

        user = request.user

        notes = Note.objects.get_accessible_notes(user).filter(id__in=note_ids)
        if notes.count() != len(note_ids):
            raise NotesNotFoundException(detail="Some of the selected notes could not be found.")

        if (strategy_key or "").lower() not in PUBLISH_STRATEGIES:
            raise ExportFormatNotFoundException(detail="That export format could not be found.")

        with transaction.atomic():
            report = PublishedReport.objects.create(
                title=title,
                user=user,
                strategy=strategy_key,
                anonymized=anonymized,
            )
            report.notes.set(notes)
            report.log_create(user)

        generate_report.delay(report.id)

        location = request.build_absolute_uri(reverse("report_detail", kwargs={"pk": report.id}))
        return Response(
            ReportListSerializer(report).data,
            status=status.HTTP_201_CREATED,
            headers={"Location": location},
        )
