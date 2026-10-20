"""JWT cookie and API key authentication backends."""

import logging
from dataclasses import dataclass
from datetime import datetime

from django.conf import settings
from django.http.cookie import parse_cookie
from django.middleware.csrf import CsrfViewMiddleware
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

from .models import CradleUser, UserSession
from .utils.tokens import token_expires_at

logger = logging.getLogger(__name__)


class CookieJWTAuthentication(JWTAuthentication):
    """Read the access JWT from its HttpOnly cookie (tokens are never exposed to page scripts).

    Enforces CSRF for unsafe methods since cookies are sent automatically.
    """

    def authenticate(self, request):
        cookie_name = settings.JWT_ACCESS_COOKIE_NAME
        raw_token = request.COOKIES.get(cookie_name)
        if not raw_token:
            return None
        self.enforce_csrf(request)
        validated_token = self.get_validated_token(raw_token)
        user = self.get_user(validated_token)
        if not UserSession.is_active(validated_token.get("sid"), user):
            raise AuthenticationFailed(detail="This session has ended. Please sign in again.")
        return user, validated_token

    def enforce_csrf(self, request):
        """Enforce CSRF check for unsafe methods. Safe methods are skipped."""
        if request.method in ("GET", "HEAD", "OPTIONS", "TRACE"):
            return

        class CSRFCheck(CsrfViewMiddleware):
            def _reject(self, request, reason):
                return reason

        reason = CSRFCheck(lambda req: None).process_view(request, None, (), {})
        if reason:
            logger.warning("CSRF verification failed: %s", reason)
            raise AuthenticationFailed(detail="Your session could not be verified. Refresh the page and try again.")


@dataclass(frozen=True)
class WebSocketSession:
    """The signed-in user of a WebSocket, the login session it belongs to, and when its access token expires."""

    user: CradleUser
    session_id: str
    expires_at: datetime


def websocket_session(scope) -> WebSocketSession | None:
    """Return the session for the access-token cookie on a WebSocket scope, or None."""
    cookie_header = dict(scope.get("headers") or []).get(b"cookie", b"").decode("latin-1")
    token = parse_cookie(cookie_header).get(settings.JWT_ACCESS_COOKIE_NAME)
    if not isinstance(token, str) or not token:
        return None
    auth = JWTAuthentication()
    try:
        validated = auth.get_validated_token(token)
        user = auth.get_user(validated)
    except InvalidToken, TokenError, AuthenticationFailed:
        return None
    if not UserSession.is_active(validated.get("sid"), user):
        return None
    return WebSocketSession(user, str(validated["sid"]), token_expires_at(validated))


class APIKeyAuthentication(BaseAuthentication):
    """API Key based authentication.

    Clients should include the API key in the Api-Key header as the raw key value.
    """

    def authenticate(self, request):
        auth_header = request.headers.get("Api-Key")
        if not auth_header:
            return None

        user = CradleUser.objects.active().with_api_key(auth_header).first()
        if user is not None:
            return (user, None)

        raise AuthenticationFailed(detail="The API key is not valid.")
