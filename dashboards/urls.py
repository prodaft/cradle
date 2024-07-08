from django.urls import path

from .views.actor_dashboard_view import ActorDashboard
from .views.case_dashboard_view import CaseDashboard
from .views.artifact_dashboard_view import ArtifactDashboard

urlpatterns = [
    path(
        "cases/<path:case_name>/",
        CaseDashboard.as_view(),
        name="case_dashboard",
    ),
    path(
        "actors/<path:actor_name>/",
        ActorDashboard.as_view(),
        name="actor_dashboard",
    ),
    path(
        "artifacts/<path:artifact_name>/",
        ArtifactDashboard.as_view(),
        name="artifact_dashboard",
    ),
]
