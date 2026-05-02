"""URL configuration for Cradle. Mounts admin at /<ADMIN_PATH>/, API under /api/."""

from django.conf import settings
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)

from user.views.oauth_view import OAuthLoginView
from user.views.token_view import LogoutView, TokenObtainPairLogView, TokenRefreshLogView
from user.views.user_view import ChangePasswordView, EmailConfirm, PasswordReset, SignupView, UserConfigView

admin_path = path(settings.ADMIN_PATH, admin.site.urls)

api_patterns = [
    path("auth/login/", TokenObtainPairLogView.as_view(), name="auth_login"),
    path("auth/logout/", LogoutView.as_view(), name="auth_logout"),
    path("auth/signup/", SignupView.as_view(), name="auth_signup"),
    path("auth/refresh/", TokenRefreshLogView.as_view(), name="auth_refresh"),
    path("auth/reset-password/", PasswordReset.as_view(), name="auth_reset_password"),
    path("auth/email-confirm/", EmailConfirm.as_view(), name="auth_email_confirm"),
    path("auth/change-password/", ChangePasswordView.as_view(), name="auth_change_password"),
    path("auth/oauth/login/", OAuthLoginView.as_view(), name="auth_oauth_login"),
    path("auth/config/", UserConfigView.as_view(), name="auth_config"),
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
    path("statistics/", include("statistics.urls")),
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
    path("", include([admin_path])),
    path(api_prefix, include(api_patterns)),
]
