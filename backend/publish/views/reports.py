from rest_framework import generics, status, filters
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication

from notes.models import Note

from ..models import PublishedReport, ReportStatus
from ..tasks import generate_report, edit_report
from ..serializers import EditReportSerializer, ReportSerializer

from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiParameter

@extend_schema_view(
    get=extend_schema(
        summary="Get published reports",
        description="Returns a paginated list of published reports for the authenticated user, ordered by creation date descending. Can be filtered by search term matching report ID or title.",
        parameters=[
            OpenApiParameter(
                name="search",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Search term to filter reports by ID or title"
            ),
            OpenApiParameter(
                name="page",
                type=int,
                location=OpenApiParameter.QUERY,
                description="Page number for pagination"
            )
        ],
        responses={
            200: ReportSerializer(many=True),
            401: {"description": "User is not authenticated"}
        }
    )
)
class ReportListDeleteAPIView(generics.ListAPIView):
    def get_queryset(self):
        return PublishedReport.objects.filter(user=self.request.user).order_by(
            "-created_at"
        )

    serializer_class = ReportSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    filter_backends = [filters.SearchFilter]
    search_fields = ["id", "title"]

@extend_schema_view(
    post=extend_schema(
        summary="Retry failed report generation",
        description="Resets the report status, re-queues the generation task, and returns the updated report. Only works for failed reports - cannot retry reports that are currently processing or already completed.",
        responses={
            200: ReportSerializer,
            400: {
                "type": "object",
                "properties": {
                    "detail": {
                        "type": "string",
                        "example": "Report is already being generated."
                    }
                }
            },
            401: {"description": "User is not authenticated"},
            404: {
                "type": "object",
                "properties": {
                    "detail": {
                        "type": "string",
                        "example": "Report not found."
                    }
                }
            }
        }
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
            404: {"description": "Report not found"}
        }
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
            404: {
                "description": "Report or one or more notes not found"
            }
        }
    ),
    delete=extend_schema(
        summary="Delete report",
        description="Deletes a specific report belonging to the authenticated user.",
        responses={
            204: {"description": "Report deleted successfully"},
            401: {"description": "User is not authenticated"},
            404: {"description": "Report not found"}
        }
    )
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
        report.delete()
        return Response(
            {"detail": "Report deleted."}, status=status.HTTP_204_NO_CONTENT
        )
