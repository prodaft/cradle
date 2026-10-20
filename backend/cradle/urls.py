"""URL configuration for Cradle. Mounts Django admin at /admin/<ADMIN_PATH_UUID>/, API under /api/."""

from django.conf import settings
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)

api_patterns = [
    path("auth/", include("user.auth_urls")),
    path("reports/", include("publish.urls")),
    path("users/", include("user.urls")),
    path("logs/", include("logs.urls")),
    path("entries/", include("entries.urls")),
    path("notes/", include("notes.urls")),
    path("teams/", include("teams.urls")),
    path("query/", include("query.urls")),
    path("files/", include("file_transfer.urls")),
    path("notifications/", include("notifications.urls")),
    path("knowledge-graph/", include("knowledge_graph.urls")),
    path("lsp/", include("lsp.urls")),
    path("intelio/", include("intelio.urls")),
    path("management/", include("management.urls")),
    path(
        "schema/",
        SpectacularAPIView.as_view(api_version=settings.VERSION),
        name="schema",
    ),
    path(
        "schema/swagger-ui/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
    path(
        "schema/redoc/",
        SpectacularRedocView.as_view(url_name="schema"),
        name="redoc",
    ),
]
if settings.USE_SILK:
    api_patterns.append(path("silk/", include("silk.urls", namespace="silk")))

api_prefix = "api/"

urlpatterns = [
    path(
        "admin/",
        include([path(f"{settings.ADMIN_PATH_UUID}/", admin.site.urls)]),
    ),
    path(api_prefix, include(api_patterns)),
]
