"""
URL configuration for cradle project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.conf import settings
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)

urlpatterns = [
    path(
        (settings.BASE_URL.strip("/") + "/").removeprefix("/"),
        include(
            [
                path(settings.ADMIN_PATH, admin.site.urls),
                path("reports/", include("publish.urls")),
                path("users/", include("user.urls")),
                path("logs/", include("logs.urls")),
                path("entries/", include("entries.urls")),
                path("notes/", include("notes.urls")),
                path("access/", include("access.urls")),
                path("query/", include("query.urls")),
                path("file-transfer/", include("file_transfer.urls")),
                path("fleeting-notes/", include("fleeting_notes.urls")),
                path("notifications/", include("notifications.urls")),
                path("knowledge-graph/", include("knowledge_graph.urls")),
                path("statistics/", include("cradle_statistics.urls")),
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
            + (
                [path("silk/", include("silk.urls", namespace="silk"))]
                if settings.USE_SILK
                else []
            ),
        ),
    ),
]
