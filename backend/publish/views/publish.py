from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from core.openapi import get_common_error_responses
from user.authentication import APIKeyAuthentication, CookieJWTAuthentication

from ..models import DownloadStrategies
from ..serializers import (
    PublishStrategiesResponseSerializer,
)


@extend_schema_view(
    get=extend_schema(
        operation_id="reports_formats_retrieve",
        summary="Get report formats",
        description="Returns available upload and download strategies for publishing reports.",  # noqa: E501
        responses={
            200: PublishStrategiesResponseSerializer,
            **get_common_error_responses(),
        },
    ),
)
class ReportFormatsAPIView(APIView):
    """List the formats a report can be generated in."""

    authentication_classes = [CookieJWTAuthentication, APIKeyAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        """Return available download strategies."""
        download_strategies = [{"label": choice.label, "strategy": choice.value} for choice in DownloadStrategies]
        return Response({"download": download_strategies}, status=status.HTTP_200_OK)
