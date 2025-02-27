from rest_framework import generics, status, filters
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from django_filters.rest_framework import DjangoFilterBackend

from notes.models import Note
from publish.strategies import PUBLISH_STRATEGIES

from ..models import PublishedReport, ReportStatus
from ..tasks import generate_report, edit_report
from ..serializers import EditReportSerializer, ReportSerializer


class ReportListDeleteAPIView(generics.ListAPIView):
    """
    GET /publish/ returns a paginated list of reports.
    DELETE /publish/ deletes a report (expects {"id": "<report_id>"} in the body).
    """

    queryset = PublishedReport.objects.all()
    serializer_class = ReportSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    filter_backends = [filters.SearchFilter]
    search_fields = ["id", "title"]


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


class ReportDetailAPIView(generics.RetrieveAPIView):
    """
    GET /reports/<id>/ returns the details of a specific report.
    """

    queryset = PublishedReport.objects.all().order_by("-created_at")
    serializer_class = ReportSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

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
