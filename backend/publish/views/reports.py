from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.db.models import Q

from core.pagination import TotalPagesPagination
from core.utils import validate_order_by
from notes.models import Note
from publish.strategies import PUBLISH_STRATEGIES

from ..models import PublishedReport, ReportStatus
from ..tasks import generate_report, edit_report
from ..serializers import (
    EditReportSerializer,
    ReportSerializer,
    ReportRetryErrorResponseSerializer,
)

from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiParameter


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
        ],
        responses={
            200: TotalPagesPagination().get_paginated_response_serializer(
                ReportSerializer
            ),
            401: {"description": "User is not authenticated"},
        },
    )
)
class ReportListDeleteAPIView(generics.ListAPIView):
    serializer_class = ReportSerializer
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
            queryset = queryset.filter(
                Q(id__icontains=search) | Q(title__icontains=search)
            )

        # Handle page_size parameter
        try:
            page_size = int(request.query_params.get("page_size", 10))
        except ValueError:
            return Response(
                "Invalid page_size value. Must be an integer.",
                status=status.HTTP_400_BAD_REQUEST,
            )

        if page_size > 200:
            return Response(
                "page_size cannot be greater than 200.",
                status=status.HTTP_400_BAD_REQUEST,
            )

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
        responses={
            200: ReportSerializer,
            400: ReportRetryErrorResponseSerializer,
            401: {"description": "User is not authenticated"},
            404: ReportRetryErrorResponseSerializer,
        },
    )
)
class ReportRetryAPIView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    serializer_class = ReportSerializer

    def post(self, request, pk):
        """
        POST /reports/<uuid:pk>/retry/
        Resets the report status, re-queues the generation task, and returns the updated report.
        """
        try:
            report = PublishedReport.objects.for_user(request.user).get(id=pk)
        except PublishedReport.DoesNotExist:
            return Response(
                {"detail": "Report not found."}, status=status.HTTP_404_NOT_FOUND
            )

        if report.status == ReportStatus.WORKING:
            return Response(
                {"detail": "Report is already being generated."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if report.status == ReportStatus.DONE:
            return Response(
                {"detail": "Report already generated successfully."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        report.status = ReportStatus.WORKING
        report.error_message = ""
        report.save()

        # Re-run the generation Celery task
        generate_report.delay(report.id)

        return Response(ReportSerializer(report).data, status=status.HTTP_200_OK)


@extend_schema_view(
    get=extend_schema(
        summary="Get report details",
        description="Returns the details of a specific report belonging to the authenticated user.",
        responses={
            200: ReportSerializer,
            401: {"description": "User is not authenticated"},
            404: {"description": "Report not found"},
        },
    ),
    put=extend_schema(
        summary="Update report",
        description="Updates an existing report with new notes and title.",
        request=EditReportSerializer,
        responses={
            200: ReportSerializer,
            400: {
                "description": "Invalid request data or report is already being generated"
            },
            401: {"description": "User is not authenticated"},
            403: {"description": "Note is not publishable"},
            404: {"description": "Report or one or more notes not found"},
        },
    ),
    delete=extend_schema(
        summary="Delete report",
        description="Deletes a specific report belonging to the authenticated user.",
        responses={
            204: {"description": "Report deleted successfully"},
            401: {"description": "User is not authenticated"},
            404: {"description": "Report not found"},
        },
    ),
)
class ReportDetailAPIView(generics.RetrieveAPIView):
    """
    GET /reports/<id>/ returns the details of a specific report.
    """

    serializer_class = ReportSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return PublishedReport.objects.filter(user=self.request.user).order_by(
            "-created_at"
        )

    def put(self, request, pk):
        try:
            report = PublishedReport.objects.for_user(request.user).get(id=pk)
        except PublishedReport.DoesNotExist:
            return Response(
                {"detail": "Report not found."}, status=status.HTTP_404_NOT_FOUND
            )

        serializer = EditReportSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        note_ids = data["note_ids"]
        title = data["title"]

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

        if report.status == ReportStatus.WORKING:
            return Response(
                {"detail": "Report is already being generated."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        report.status = ReportStatus.WORKING
        report.title = title
        report.error_message = ""

        report.save()
        report.notes.set(notes)

        edit_report.delay(str(report.id))

        return Response(
            {"detail": "Edit task queued."}, status=status.HTTP_202_ACCEPTED
        )

    def delete(self, request, pk):
        if not pk:
            return Response(
                {"detail": "Report id required."}, status=status.HTTP_400_BAD_REQUEST
            )
        try:
            report = self.get_queryset().get(id=pk)
        except PublishedReport.DoesNotExist:
            return Response(
                {"detail": "Report not found."}, status=status.HTTP_404_NOT_FOUND
            )

        publisher_factory = PUBLISH_STRATEGIES.get(report.strategy)
        if publisher_factory is not None:
            publisher = publisher_factory(report.anonymized)

            try:
                publisher.delete_report(report)
            except Exception:
                return Response(
                    {"detail": "Error deleting report."},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

        report.delete()
        return Response(
            {"detail": "Report deleted."}, status=status.HTTP_204_NO_CONTENT
        )
