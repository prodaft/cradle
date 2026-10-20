"""User app URL configuration."""

from django.urls import include, path

from notes.views.snippet_view import UserMeSnippetsView, UserSnippetsView
from teams.views import UserTeamList

from .views import user_view
from .views.oauth_view import OAuthConnectView, OAuthDisconnectView
from .views.two_factor_view import Disable2FAView, Enable2FAView, Verify2FASetupView

urlpatterns = [
    path("", user_view.UserList.as_view(), name="user_list"),
    path("me/", user_view.UserMeDetail.as_view(), kwargs={"user_id": "me"}, name="user_detail_me"),
    path("<uuid:user_id>/", user_view.UserDetail.as_view(), name="user_detail"),
    path("<uuid:user_id>/access/", include("access.user_urls")),
    path("<uuid:user_id>/teams/", UserTeamList.as_view(), name="user_team_list"),
    path("me/snippets/", UserMeSnippetsView.as_view(), kwargs={"user_id": "me"}, name="user_snippets_me"),
    path("<uuid:user_id>/snippets/", UserSnippetsView.as_view(), name="user_snippets"),
    path("<uuid:user_id>/api-key/", user_view.APIKey.as_view(), name="user_api_key"),
    path("<uuid:user_id>/password/", user_view.AdminSetPasswordView.as_view(), name="user_set_password"),
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
    path("<uuid:user_id>/simulate/", user_view.UserSimulateView.as_view(), name="user_simulate"),
    path(
        "<uuid:user_id>/email/confirmation/",
        user_view.UserConfirmationEmailView.as_view(),
        name="user_confirmation_email",
    ),
    path(
        "<uuid:user_id>/password/reset/",
        user_view.UserPasswordResetEmailView.as_view(),
        name="user_password_reset_email",
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
    path("me/password/", user_view.ChangePasswordView.as_view(), name="user_password_me"),
    path("me/2fa/enable/", Enable2FAView.as_view(), name="user_2fa_enable"),
    path("me/2fa/verify/", Verify2FASetupView.as_view(), name="user_2fa_verify"),
    path("me/2fa/disable/", Disable2FAView.as_view(), name="user_2fa_disable"),
    path("me/oauth/", OAuthConnectView.as_view(), name="user_oauth_connect"),
    path("me/oauth/<str:provider>/", OAuthDisconnectView.as_view(), name="user_oauth_disconnect"),
]
