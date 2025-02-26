from django.urls import path
from .views.publish import PublishReportAPIView
from .views.reports import ReportListDeleteAPIView, ReportDetailAPIView

urlpatterns = [
    path("publish/", PublishReportAPIView.as_view(), name="publish-report"),
    path("", ReportListDeleteAPIView.as_view(), name="report-list-delete"),
    path("<uuid:pk>/", ReportDetailAPIView.as_view(), name="report-detail"),
]
