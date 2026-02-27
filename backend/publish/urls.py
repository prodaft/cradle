from django.urls import path
from .views.publish import PublishReportAPIView
from .views.reports import (
    ReportListDeleteAPIView,
    ReportDetailAPIView,
    ReportRetryAPIView,
)

urlpatterns = [
    path("publish/", PublishReportAPIView.as_view(), name="publish_report"),
    path("", ReportListDeleteAPIView.as_view(), name="report_list_delete"),
    path("<uuid:pk>/", ReportDetailAPIView.as_view(), name="report_detail"),
    path("<uuid:pk>/retry/", ReportRetryAPIView.as_view(), name="report_retry"),
]
