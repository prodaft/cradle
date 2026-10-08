"""User app URL configuration."""

from django.urls import path

from .views import user_view
from .views.oauth_view import OAuthConnectView, OAuthDisconnectView
from .views.two_factor_view import Disable2FAView, Enable2FAView, Verify2FASetupView

urlpatterns = [
    path("oauth/connect/", OAuthConnectView.as_view(), name="user_oauth_connect"),
    path(
        "oauth/disconnect/<str:provider>/",
        OAuthDisconnectView.as_view(),
        name="user_oauth_disconnect",
    ),
    path("", user_view.UserList.as_view(), name="user_list"),
    path("me/", user_view.UserMeDetail.as_view(), kwargs={"user_id": "me"}, name="user_detail_me"),
    path("<uuid:user_id>/", user_view.UserDetail.as_view(), name="user_detail"),
    path("me/api-key/", user_view.UserMeAPIKey.as_view(), kwargs={"user_id": "me"}, name="user_api_key_me"),
    path("<uuid:user_id>/api-key/", user_view.APIKey.as_view(), name="user_api_key"),
    path(
        "me/default-note-template/",
        user_view.UserMeDefaultNoteTemplateView.as_view(),
        kwargs={"user_id": "me"},
        name="user_default_note_template_me",
    ),
    path(
        "<uuid:user_id>/default-note-template/",
        user_view.DefaultNoteTemplateView.as_view(),
        name="user_default_note_template",
    ),
    path(
        "me/manage/<str:action_name>/",
        user_view.UserMeManage.as_view(),
        kwargs={"user_id": "me"},
        name="user_manage_me",
    ),
    path(
        "<uuid:user_id>/manage/<str:action_name>/",
        user_view.ManageUser.as_view(),
        name="user_manage",
    ),
    path(
        "me/sessions/",
        user_view.UserMeSessionsListView.as_view(),
        kwargs={"user_id": "me"},
        name="user_sessions_list_me",
    ),
    path(
        "<uuid:user_id>/sessions/",
        user_view.UserSessionsListView.as_view(),
        name="user_sessions_list",
    ),
    path(
        "me/sessions/<uuid:session_id>/",
        user_view.UserMeSessionRevokeView.as_view(),
        kwargs={"user_id": "me"},
        name="user_session_revoke_me",
    ),
    path(
        "<uuid:user_id>/sessions/<uuid:session_id>/",
        user_view.UserSessionRevokeView.as_view(),
        name="user_session_revoke",
    ),
    path("2fa/enable/", Enable2FAView.as_view(), name="user_2fa_enable"),
    path("2fa/verify/", Verify2FASetupView.as_view(), name="user_2fa_verify"),
    path("2fa/disable/", Disable2FAView.as_view(), name="user_2fa_disable"),
]
