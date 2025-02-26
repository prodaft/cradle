from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication

from ..models import PublishedReport
from ..serializers import ReportSerializer


class ReportListDeleteAPIView(generics.ListAPIView):
    """
    GET /reports/ returns a paginated list of reports.
    DELETE /reports/ deletes a report (expects {"id": "<report_id>"} in the body).
    """

    queryset = PublishedReport.objects.all()
    serializer_class = ReportSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def delete(self, request, *args, **kwargs):
        report_id = request.data.get("id", None)
        if not report_id:
            return Response(
                {"detail": "Report id required."}, status=status.HTTP_400_BAD_REQUEST
            )
        try:
            report = self.get_queryset().get(id=report_id)
        except PublishedReport.DoesNotExist:
            return Response(
                {"detail": "Report not found."}, status=status.HTTP_404_NOT_FOUND
            )
        report.delete()
        return Response(
            {"detail": "Report deleted."}, status=status.HTTP_204_NO_CONTENT
        )


class ReportDetailAPIView(generics.RetrieveAPIView):
    """
    GET /reports/<id>/ returns the details of a specific report.
    """

    queryset = PublishedReport.objects.all()
    serializer_class = ReportSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
