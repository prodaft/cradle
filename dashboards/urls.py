from django.urls import path

from .views.entity_dashboard_view import EntityDashboard, EntityDashboardSecondHop
from .views.artifact_dashboard_view import ArtifactDashboard, ArtifactDashboardSecondHop

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
    ),
    path(
        "artifacts/<path:artifact_name>/level2",
        ArtifactDashboardSecondHop.as_view(),
    ),
]
