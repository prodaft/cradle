"""Authentication endpoints, mounted at /auth/: sign-in, sign-up, tokens and account recovery."""

from django.urls import path

from .views.oauth_view import OAuthLoginView
from .views.token_view import LogoutView, TokenObtainPairLogView, TokenRefreshLogView
from .views.user_view import EmailConfirm, PasswordResetConfirm, PasswordResetRequest, SignupView, UserConfigView

urlpatterns = [
    path("login/", TokenObtainPairLogView.as_view(), name="auth_login"),
    path("logout/", LogoutView.as_view(), name="auth_logout"),
    path("signup/", SignupView.as_view(), name="auth_signup"),
    path("refresh/", TokenRefreshLogView.as_view(), name="auth_refresh"),
    path("password/reset/", PasswordResetRequest.as_view(), name="auth_password_reset"),
    path("password/reset/confirm/", PasswordResetConfirm.as_view(), name="auth_password_reset_confirm"),
    path("email/confirm/", EmailConfirm.as_view(), name="auth_email_confirm"),
    path("oauth/login/", OAuthLoginView.as_view(), name="auth_oauth_login"),
    path("config/", UserConfigView.as_view(), name="auth_config"),
]
