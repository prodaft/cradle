from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from core.openapi import get_error_responses, get_common_error_responses, get_validation_error_response
from notes.models import Note

from ..models import DownloadStrategies, PublishedReport, UploadStrategies
from ..serializers import (
    PublishReportSerializer,
    PublishStrategiesResponseSerializer,
    ReportSerializer,
)
from ..strategies import PUBLISH_STRATEGIES
from ..tasks import generate_report
from ..exceptions import (
    NotesNotFoundException,
    StrategyNotFoundException,
    PublishErrorCodes,
)


@extend_schema_view(
    get=extend_schema(
        summary="Get publish strategies",
        description="Returns available upload and download strategies for publishing reports.",  # noqa: E501
        responses={
            200: PublishStrategiesResponseSerializer,
            **get_common_error_responses(),
        },
    ),
    post=extend_schema(
        summary="Create published report",
        description="Creates a new published report from selected notes using specified strategy.",  # noqa: E501
        request=PublishReportSerializer,
        responses={
            201: ReportSerializer,
            **get_error_responses(
                PublishErrorCodes.NOTES_NOT_FOUND,
                PublishErrorCodes.STRATEGY_NOT_FOUND
            ),
            **get_validation_error_response(),
            **get_common_error_responses(),
        },
    ),
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
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        note_ids = data["note_ids"]
        title = data["title"]
        strategy_key = data["strategy"]
        anonymized = data["anonymized"]

        user = request.user

        notes = Note.objects.filter(id__in=note_ids)
        if notes.count() != len(note_ids):
            raise NotesNotFoundException(detail="One or more notes not found.")

        publisher_factory = PUBLISH_STRATEGIES.get(strategy_key)

        if publisher_factory is None:
            raise StrategyNotFoundException(detail="Strategy not found.")

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
