from .views.two_factor_view import Enable2FAView, Verify2FASetupView, Disable2FAView
from .views.oauth_view import OAuthConnectView, OAuthDisconnectView

from django.urls import path
from .views import user_view

urlpatterns = [
    path("config/", user_view.UserConfigView.as_view(), name="user_config"),
    path("oauth/connect/", OAuthConnectView.as_view(), name="user_oauth_connect"),
    path(
        "oauth/disconnect/<str:provider>/",
        OAuthDisconnectView.as_view(),
        name="user_oauth_disconnect",
    ),
    path("", user_view.UserList.as_view(), name="user_list"),
    path(
        "<str:user_id>/",
        user_view.UserDetail.as_view(),
        name="user_detail",
    ),
    path(
        "<str:user_id>/apikey/",
        user_view.APIKey.as_view(),
        name="user_apikey",
    ),
    path(
        "<str:user_id>/default_note_template/",
        user_view.DefaultNoteTemplateView.as_view(),
        name="user_default_note_template",
    ),
    path(
        "<uuid:user_id>/manage/<str:action_name>/",
        user_view.ManageUser.as_view(),
        name="user_manage",
    ),
    path(
        "<str:user_id>/sessions/",
        user_view.UserSessionsListView.as_view(),
        name="user_sessions_list",
    ),
    path(
        "<str:user_id>/sessions/<uuid:session_id>/",
        user_view.UserSessionRevokeView.as_view(),
        name="user_session_revoke",
    ),
    path("2fa/enable/", Enable2FAView.as_view(), name="enable_2fa"),
    path("2fa/verify/", Verify2FASetupView.as_view(), name="verify_2fa"),
    path("2fa/disable/", Disable2FAView.as_view(), name="disable_2fa"),
]
