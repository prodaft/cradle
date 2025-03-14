import json
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, JSONParser
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.permissions import IsAuthenticated

from publish.models import PublishedReport, ReportStatus
from publish.tasks import import_json_report
from user.permissions import HasAdminRole  # our new task

from drf_spectacular.utils import extend_schema, extend_schema_view


@extend_schema_view(
    post=extend_schema(
        summary="Import JSON report",
        description="Import a JSON report file containing notes and entry classes. Creates a PublishedReport record and queues processing task.",  # noqa: E501
        request={
            "multipart/form-data": {
                "type": "object",
                "properties": {
                    "report": {
                        "type": "string",
                        "format": "binary",
                        "description": "JSON file containing report data with 'notes' and 'entry_classes' keys",
                    }
                },
                "required": ["report"],
            }
        },
        responses={
            202: {
                "type": "object",
                "properties": {
                    "detail": {"type": "string", "example": "Report import queued."},
                    "report_id": {
                        "type": "string",
                        "format": "uuid",
                        "example": "123e4567-e89b-12d3-a456-426614174000",
                    },
                },
            },
            400: {
                "type": "object",
                "properties": {
                    "detail": {"type": "string", "example": "No report file provided."}
                },
            },
            401: {"description": "User is not authenticated"},
            403: {"description": "User does not have admin role"},
        },
    )
)
class ImportJSONReportAPIView(APIView):
    """
    API endpoint to import a JSON report.
    Expects a file upload (field "report") containing a JSON document
    with keys "notes", "entry_classes", and "file_urls".

    This endpoint creates a PublishedReport record (using a custom "json-import"
    strategy) so that it appears in the existing UI. It then enqueues a celery
    task to process the import and update the report.
    """

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, HasAdminRole]
    parser_classes = [MultiPartParser, JSONParser]

    def post(self, request):
        report_file = request.FILES.get("report")
        if not report_file:
            return Response(
                {"detail": "No report file provided."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            report_data = json.load(report_file)
        except Exception:
            return Response(
                {"detail": "Invalid JSON file."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        for key in ("notes", "entry_classes"):
            if key not in report_data:
                return Response(
                    {"detail": f"Missing key in report: {key}"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        report = PublishedReport.objects.create(
            title=f'[IMPORT] {report_data.get("title")}',
            user=request.user,
            strategy="import",
            report_location="",
            status=ReportStatus.WORKING,
        )
        report.set_mode()

        import_json_report.delay(report_data, request.user.id, str(report.id))
        return Response(
            {"detail": "Report import queued.", "report_id": str(report.id)},
            status=status.HTTP_202_ACCEPTED,
        )
