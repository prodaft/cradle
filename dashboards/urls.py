from django.urls import path

from .views.actor_dashboard_view import ActorDashboard
from .views.case_dashboard_view import CaseDashboard

urlpatterns = [
    path(
        "cases/<str:case_name>/",
        CaseDashboard.as_view(),
        name="case_dashboard",
    ),
    path(
        "actors/<str:actor_name>/",
        ActorDashboard.as_view(),
        name="actor_dashboard",
    ),
]
