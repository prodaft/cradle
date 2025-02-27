from django.urls import path
from .views.publish import PublishReportAPIView
from .views.reports import (
    ReportListDeleteAPIView,
    ReportDetailAPIView,
    ReportRetryAPIView,
)
from .views.importjson import ImportJSONReportAPIView

urlpatterns = [
    path("import/", ImportJSONReportAPIView.as_view(), name="import-report"),
    path("publish/", PublishReportAPIView.as_view(), name="publish-report"),
    path("", ReportListDeleteAPIView.as_view(), name="report-list-delete"),
    path("<uuid:pk>/", ReportDetailAPIView.as_view(), name="report-detail"),
    path("<uuid:pk>/retry/", ReportRetryAPIView.as_view(), name="report-retry"),
]
