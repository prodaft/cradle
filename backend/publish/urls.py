"""URL routing for publish app: reports (list/create, formats, detail, retry)."""

from django.urls import path

from .views.publish import ReportFormatsAPIView
from .views.reports import (
    ReportDetailAPIView,
    ReportListAPIView,
    ReportRetryAPIView,
)

urlpatterns = [
    path("", ReportListAPIView.as_view(), name="report_list"),
    path("formats/", ReportFormatsAPIView.as_view(), name="report_formats"),
    path("<uuid:report_id>/", ReportDetailAPIView.as_view(), name="report_detail"),
    path("<uuid:report_id>/retry/", ReportRetryAPIView.as_view(), name="report_retry"),
]
