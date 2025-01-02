from django.urls import path

from .views.entity_dashboard_view import EntityDashboard, EntityDashboardSecondHop
from .views.artifact_dashboard_view import ArtifactDashboard

urlpatterns = [
    path(
        "entities/<path:entity_name>/",
        EntityDashboard.as_view(),
        name="entity_dashboard",
    ),
    path(
        "entities/<path:entity_name>/level2",
        EntityDashboardSecondHop.as_view(),
        name="entity_dashboard",
    ),
    path(
        "artifacts/<path:artifact_name>/",
        ArtifactDashboard.as_view(),
        name="artifact_dashboard",
    ),
]
