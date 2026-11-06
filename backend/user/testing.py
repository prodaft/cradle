"""Test helpers: tokens issued the way login issues them."""

from rest_framework_simplejwt.tokens import AccessToken, RefreshToken

from .models import CradleUser, UserSession
from .serializers import TokenObtainSerializer


def login_tokens(user: CradleUser) -> tuple[RefreshToken, AccessToken]:
    """Return a refresh/access pair bound to a new login session (cookie auth rejects tokens without one)."""
    refresh = TokenObtainSerializer.get_token(user)
    UserSession.objects.record(user, refresh)
    return refresh, refresh.access_token


def session_access_token(user: CradleUser) -> AccessToken:
    """Return an access token bound to a new login session."""
    return login_tokens(user)[1]
