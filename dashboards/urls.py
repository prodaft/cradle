from django.urls import path

from .views import case_dashboard_view

urlpatterns = [
    path(
        "cases/<str:case_name>/",
        case_dashboard_view.CaseDashboard.as_view(),
        name="case_dashboard",
    ),
]
