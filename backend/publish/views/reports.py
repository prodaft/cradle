from django.db.models import Q
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from core.openapi import (
    get_common_error_responses,
    get_error_responses,
)
from core.pagination import TotalPagesPagination
from core.utils import validate_order_by
from publish.strategies import PUBLISH_STRATEGIES

from ..exceptions import (
    InvalidPageSizeException,
    PageSizeTooLargeException,
    PublishErrorCodes,
    ReportAlreadyCompletedException,
    ReportAlreadyGeneratingException,
    ReportDeleteErrorException,
    ReportIdRequiredException,
    ReportNotFoundException,
)
from ..models import PublishedReport, ReportStatus
from ..serializers import (
    ReportDetailSerializer,
    ReportListSerializer,
)
from ..tasks import generate_report


@extend_schema_view(
    get=extend_schema(
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
            200: ReportListSerializer,
            **get_error_responses(
                PublishErrorCodes.INVALID_PAGE_SIZE,
                PublishErrorCodes.PAGE_SIZE_TOO_LARGE,
            ),
            **get_common_error_responses(),
        },
    )
)
class ReportListDeleteAPIView(generics.ListAPIView):
    serializer_class = ReportListSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    pagination_class = TotalPagesPagination

    def get_queryset(self):
        return PublishedReport.objects.filter(user=self.request.user)

    def get(self, request, *args, **kwargs):
        queryset = self.get_queryset()

        # Handle search parameter
        search = request.query_params.get("search")
        if search:
            queryset = queryset.filter(Q(id__icontains=search) | Q(title__icontains=search))

        # Handle status filter
        status_filter = request.query_params.get("status")
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        # Handle page_size parameter
        try:
            page_size = int(request.query_params.get("page_size", 10))
        except ValueError:
            raise InvalidPageSizeException(detail="Invalid page_size value. Must be an integer.")

        if page_size > 200:
            raise PageSizeTooLargeException(detail="page_size cannot be greater than 200.")

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
        order_fields, error_response = validate_order_by(order_by, valid_order_fields)
        if error_response:
            return error_response

        if order_fields:
            queryset = queryset.order_by(*order_fields)
        else:
            queryset = queryset.order_by("-created_at")

        # Apply pagination
        paginator = TotalPagesPagination(page_size=page_size)
        result_page = paginator.paginate_queryset(queryset, request)

        if result_page is not None:
            serializer = self.get_serializer(result_page, many=True)
            return paginator.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


@extend_schema_view(
    post=extend_schema(
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
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        """
        POST /reports/<uuid:pk>/retry/
        Resets the report status, re-queues the generation task, and returns the updated report.
        """
        try:
            report = PublishedReport.objects.for_user(request.user).get(id=pk)
        except PublishedReport.DoesNotExist:
            raise ReportNotFoundException(detail="Report not found.")

        if report.status == ReportStatus.WORKING:
            raise ReportAlreadyGeneratingException(detail="Report is already being generated.")

        if report.status == ReportStatus.DONE:
            raise ReportAlreadyCompletedException(detail="Report already generated successfully.")

        report.status = ReportStatus.WORKING
        report.error_message = ""
        report.save()

        # Re-run the generation Celery task
        generate_report.delay(report.id)

        return Response(ReportListSerializer(report).data, status=status.HTTP_200_OK)


@extend_schema_view(
    get=extend_schema(
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
        summary="Delete report",
        description="Deletes a specific report belonging to the authenticated user.",
        responses={
            200: {"description": "Report deleted successfully"},
            **get_error_responses(
                PublishErrorCodes.REPORT_NOT_FOUND,
                PublishErrorCodes.REPORT_ID_REQUIRED,
                PublishErrorCodes.REPORT_DELETE_ERROR,
            ),
            **get_common_error_responses(),
        },
    ),
)
class ReportDetailAPIView(generics.RetrieveAPIView):
    """
    GET /reports/<id>/ returns the details of a specific report.
    """

    serializer_class = ReportDetailSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        download_url = request.query_params.get("download_url", False) == "true"
        return Response(
            ReportDetailSerializer(self.get_object(), context={"download_url": download_url}).data,
            status=status.HTTP_200_OK,
        )

    def get_queryset(self):
        return PublishedReport.objects.filter(user=self.request.user).order_by("-created_at")

    def delete(self, request, pk):
        if not pk:
            raise ReportIdRequiredException(detail="Report id required.")

        try:
            report = self.get_queryset().get(id=pk)
        except PublishedReport.DoesNotExist:
            raise ReportNotFoundException(detail="Report not found.")

        publisher_factory = PUBLISH_STRATEGIES.get(report.strategy)
        if publisher_factory is not None:
            publisher = publisher_factory(report.anonymized)

            try:
                publisher.delete_report(report)
            except Exception:
                raise ReportDeleteErrorException(detail="Error deleting report.")

        report.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
