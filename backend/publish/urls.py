"""URL routing for publish app (report list, detail, publish, retry)."""

from django.urls import path

from .views.publish import PublishReportAPIView
from .views.reports import (
    ReportDetailAPIView,
    ReportListAPIView,
    ReportRetryAPIView,
)

urlpatterns = [
    path("publish/", PublishReportAPIView.as_view(), name="publish_report"),
    path("", ReportListAPIView.as_view(), name="report_list"),
    path("<uuid:report_id>/", ReportDetailAPIView.as_view(), name="report_detail"),
    path("<uuid:report_id>/retry/", ReportRetryAPIView.as_view(), name="report_retry"),
]
