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
from user.views.token_view import TokenObtainPairLogView, TokenRefreshLogView
from user.views.user_view import SignupView, EmailConfirm, PasswordReset, ChangePasswordView
from user.views.oauth_view import OAuthLoginView

base_url = settings.BASE_URL.strip("/")

urlpatterns = [
    path(
        (base_url + "/").removeprefix("/") if base_url else "",
        include(
            [
                path(settings.ADMIN_PATH, admin.site.urls),
            ]
        ),
    ),
    path(
        "api/",
        include(
            [
                path("auth/login/", TokenObtainPairLogView.as_view(), name="auth_login"),
                path("auth/signup/", SignupView.as_view(), name="auth_signup"),
                path("auth/refresh/", TokenRefreshLogView.as_view(), name="auth_refresh"),
                path("auth/reset_password/", PasswordReset.as_view(), name="auth_reset_password"),
                path("auth/email_confirm/", EmailConfirm.as_view(), name="auth_email_confirm"),
                path("auth/change_password/", ChangePasswordView.as_view(), name="auth_change_password"),
                path("auth/oauth/login/", OAuthLoginView.as_view(), name="auth_oauth_login"),
                path("reports/", include("publish.urls")),
                path("users/", include("user.urls")),
                path("logs/", include("logs.urls")),
                path("entries/", include("entries.urls")),
                path("notes/", include("notes.urls")),
                path("access/", include("access.urls")),
                path("query/", include("query.urls")),
                path("file-transfer/", include("file_transfer.urls")),
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
