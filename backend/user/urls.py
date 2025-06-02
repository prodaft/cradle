from .views.token_view import TokenObtainPairLogView, TokenRefreshLogView
from .views.two_factor_view import Enable2FAView, Verify2FASetupView, Disable2FAView

from django.urls import path
from .views import user_view

urlpatterns = [
    path("login/", TokenObtainPairLogView.as_view(), name="user_login"),
    path("refresh/", TokenRefreshLogView.as_view(), name="user_refresh"),
    path("", user_view.UserList.as_view(), name="user_list"),
    path(
        "change_password/",
        user_view.ChangePasswordView.as_view(),
        name="change-password",
    ),
    path(
        "email_confirm/",
        user_view.EmailConfirm.as_view(),
        name="email_confirm",
    ),
    path(
        "reset_password/",
        user_view.PasswordReset.as_view(),
        name="reset_password",
    ),
    path(
        "<str:user_id>/",
        user_view.UserDetail.as_view(),
        name="user_detail",
    ),
    path(
        "<str:user_id>/apikey",
        user_view.APIKey.as_view(),
        name="user_apikey",
    ),
    path(
        "<uuid:user_id>/manage/<str:action_name>",
        user_view.ManageUser.as_view(),
        name="user_manage",
    ),
    path("2fa/enable/", Enable2FAView.as_view(), name="enable-2fa"),
    path("2fa/verify/", Verify2FASetupView.as_view(), name="verify-2fa"),
    path("2fa/disable/", Disable2FAView.as_view(), name="disable-2fa"),
]
