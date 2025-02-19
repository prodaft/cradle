from .views.token_view import TokenObtainPairLogView, TokenRefreshLogView

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
        "<uuid:user_id>/manage/<str:action_name>",
        user_view.ManageUser.as_view(),
        name="user_manage",
    ),
]
