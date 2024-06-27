from django.urls import path

from .views.actor_dashboard_view import ActorDashboard
from .views.case_dashboard_view import CaseDashboard
from .views.entry_dashboard_view import EntryDashboard

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
        "entries/<path:entry_name>/",
        EntryDashboard.as_view(),
        name="entry_dashboard",
    ),
]
