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
from django.urls import include, path
from django.contrib import admin

urlpatterns = [
    path(
        settings.BASE_URL,
        include(
            [
                path(settings.ADMIN_PATH, admin.site.urls),
                path("publish/", include("publish.urls")),
                path("users/", include("user.urls")),
                path("entries/", include("entries.urls")),
                path("notes/", include("notes.urls")),
                path("dashboards/", include("dashboards.urls")),
                path("access/", include("access.urls")),
                path("query/", include("query.urls")),
                path("file-transfer/", include("file_transfer.urls")),
                path("fleeting-notes/", include("fleeting_notes.urls")),
                path("notifications/", include("notifications.urls")),
                path("knowledge-graph/", include("knowledge_graph.urls")),
                path("statistics/", include("cradle_statistics.urls")),
                path("lsp/", include("lsp.urls")),
            ],
        ),
    ),
]
