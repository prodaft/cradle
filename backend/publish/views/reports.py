from uuid import UUID

from django.db import transaction
from django.db.models import Q
from django.http import Http404
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from core.exceptions import CoreErrorCodes
from core.openapi import (
    get_common_error_responses,
    get_error_responses,
)
from core.pagination import TotalPagesPagination
from core.utils import validate_order_by
from core.validators import validate_choice_param
from user.authentication import APIKeyAuthentication

from ..exceptions import (
    PublishErrorCodes,
    ReportAlreadyCompletedException,
    ReportAlreadyGeneratingException,
    ReportDeleteFailedException,
    ReportNotFoundException,
)
from ..models import PublishedReport, ReportStatus
from ..serializers import (
    ReportDetailSerializer,
    ReportListSerializer,
)
from ..strategies import PUBLISH_STRATEGIES
from ..tasks import generate_report


@extend_schema_view(
    get=extend_schema(
        operation_id="reports_list",
        summary="Get published reports",
        description="Returns a paginated list of published reports for the authenticated user, ordered by creation date descending. Can be filtered by search term matching report ID or title.",  # noqa: E501
        parameters=[
            OpenApiParameter(
                name="search",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Search term to filter reports by ID or title",
            ),
            OpenApiParameter(
                name="page_size",
                type=int,
                location=OpenApiParameter.QUERY,
                description="Number of reports to return per page. Max 200.",
                default=10,
            ),
            OpenApiParameter(
                name="page",
                type=int,
                location=OpenApiParameter.QUERY,
                description="Page number for pagination",
            ),
            OpenApiParameter(
                name="order_by",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Order reports by field(s). Prefix with '-' for descending order. Multiple fields can be separated by commas. Valid fields: created_at, title, status, strategy, user__username. Default: -created_at",  # noqa: E501
                required=False,
                default="-created_at",
            ),
            OpenApiParameter(
                name="status",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Filter reports by status (e.g. done, working, error)",
                required=False,
            ),
        ],
        responses={
            200: TotalPagesPagination().get_paginated_response_serializer(
                ReportListSerializer, name="ReportListPaginatedResponse"
            ),
            **get_error_responses(
                CoreErrorCodes.INVALID_PAGE_SIZE,
                CoreErrorCodes.PAGE_SIZE_TOO_LARGE,
                CoreErrorCodes.INVALID_REQUEST,
            ),
            **get_common_error_responses(),
        },
    )
)
class ReportListAPIView(generics.ListAPIView):
    """List published reports for the authenticated user with search, filter, and ordering."""

    serializer_class = ReportListSerializer
    authentication_classes = [JWTAuthentication, APIKeyAuthentication]
    permission_classes = [IsAuthenticated]
    pagination_class = TotalPagesPagination

    def get_queryset(self):
        """Return reports scoped to the authenticated user."""
        return PublishedReport.objects.for_user(self.request.user)

    def get(self, request: Request, *args, **kwargs) -> Response:
        queryset = self.get_queryset()

        # Handle search parameter
        search = request.query_params.get("search")
        if search:
            search_filter = Q(title__icontains=search)
            try:
                search_uuid = UUID(search)
                search_filter |= Q(id=search_uuid)
            except (ValueError, TypeError):
                pass
            queryset = queryset.filter(search_filter)

        # Handle status filter
        status_filter = validate_choice_param(
            request.query_params.get("status"),
            [c[0] for c in ReportStatus.choices],
            param_name="status",
        )
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        # Handle ordering
        order_by = request.query_params.get("order_by", "-created_at")
        valid_order_fields = [
            "created_at",
            "title",
            "status",
            "strategy",
            "user__username",
        ]

        # Parse and validate order_by parameter
        order_fields = validate_order_by(order_by, valid_order_fields)
        if order_fields:
            queryset = queryset.order_by(*order_fields)
        else:
            queryset = queryset.order_by("-created_at")

        # Apply pagination
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(queryset, request)
        serializer = self.get_serializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)


@extend_schema_view(
    post=extend_schema(
        operation_id="reports_retry_create",
        summary="Retry failed report generation",
        description="Resets the report status, re-queues the generation task, and returns the updated report. Only works for failed reports - cannot retry reports that are currently processing or already completed.",  # noqa: E501
        request=None,
        responses={
            200: ReportListSerializer,
            **get_error_responses(
                PublishErrorCodes.REPORT_NOT_FOUND,
                PublishErrorCodes.REPORT_ALREADY_GENERATING,
                PublishErrorCodes.REPORT_ALREADY_COMPLETED,
            ),
            **get_common_error_responses(),
        },
    )
)
class ReportRetryAPIView(APIView):
    """Retry failed report generation by re-queuing the Celery task."""

    authentication_classes = [JWTAuthentication, APIKeyAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request: Request, pk: UUID) -> Response:
        """Reset report status, re-queue generation task, and return updated report."""
        try:
            report = PublishedReport.objects.for_user(request.user).get(id=pk)
        except PublishedReport.DoesNotExist:
            raise ReportNotFoundException(detail="That report could not be found.")

        if report.status == ReportStatus.WORKING:
            raise ReportAlreadyGeneratingException(detail="Report generation is already in progress.")

        if report.status == ReportStatus.DONE:
            raise ReportAlreadyCompletedException(detail="This report has already been generated.")

        with transaction.atomic():
            report.status = ReportStatus.WORKING
            report.error_message = ""
            report.save()

        # Re-run the generation Celery task
        generate_report.delay(report.id)

        return Response(ReportListSerializer(report).data, status=status.HTTP_200_OK)


@extend_schema_view(
    get=extend_schema(
        operation_id="reports_retrieve",
        summary="Get report details",
        description="Returns the details of a specific report belonging to the authenticated user.",
        parameters=[
            OpenApiParameter(
                name="download_url",
                type=bool,
                location=OpenApiParameter.QUERY,
                description="Whether to return the download URL for the report",
                default=False,
            ),
        ],
        responses={
            200: ReportDetailSerializer,
            **get_error_responses(PublishErrorCodes.REPORT_NOT_FOUND),
            **get_common_error_responses(),
        },
    ),
    delete=extend_schema(
        operation_id="reports_destroy",
        summary="Delete report",
        description="Deletes a specific report belonging to the authenticated user.",
        responses={
            204: {"description": "Report deleted successfully"},
            **get_error_responses(
                PublishErrorCodes.REPORT_NOT_FOUND,
                PublishErrorCodes.REPORT_DELETE_FAILED,
            ),
            **get_common_error_responses(),
        },
    ),
)
class ReportDetailAPIView(generics.RetrieveDestroyAPIView):
    """Retrieve or delete a specific report belonging to the authenticated user."""

    serializer_class = ReportDetailSerializer
    authentication_classes = [JWTAuthentication, APIKeyAuthentication]
    permission_classes = [IsAuthenticated]

    def retrieve(self, request: Request, *args, **kwargs) -> Response:
        """Return report details; include presigned download URL if download_url=true."""
        val = request.query_params.get("download_url", "")
        download_url = str(val).lower() in ("true", "1", "yes")
        return Response(
            ReportDetailSerializer(self.get_object(), context={"download_url": download_url}).data,
            status=status.HTTP_200_OK,
        )

    def get_queryset(self):
        """Return reports scoped to the authenticated user."""
        return PublishedReport.objects.for_user(self.request.user)

    def get_object(self):
        try:
            return super().get_object()
        except Http404:
            raise ReportNotFoundException(detail="That report could not be found.")

    def destroy(self, request: Request, *args, **kwargs) -> Response:
        """Delete the report and any associated external resources."""
        report = self.get_object()
        with transaction.atomic():
            publisher_factory = PUBLISH_STRATEGIES.get((report.strategy or "").lower())
            if publisher_factory is not None:
                publisher = publisher_factory(report.anonymized)
                try:
                    publisher.delete_report(report)
                except (OSError, IOError):
                    raise ReportDeleteFailedException(detail="The report could not be deleted. Please try again later.")
            report.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
