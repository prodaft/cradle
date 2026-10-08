"""JWT cookie and API key authentication backends."""

import logging

import bcrypt
from django.conf import settings
from django.http.cookie import parse_cookie
from django.middleware.csrf import CsrfViewMiddleware
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

from .models import CradleUser

logger = logging.getLogger(__name__)


class CookieJWTAuthentication(JWTAuthentication):
    """Read the access JWT from its HttpOnly cookie (tokens are never exposed to page scripts).

    Enforces CSRF for unsafe methods since cookies are sent automatically.
    """

    def authenticate(self, request):
        cookie_name = getattr(settings, "JWT_ACCESS_COOKIE_NAME", "access_token")
        raw_token = request.COOKIES.get(cookie_name)
        if not raw_token:
            return None
        self.enforce_csrf(request)
        validated_token = self.get_validated_token(raw_token)
        return self.get_user(validated_token), validated_token

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


def user_from_websocket_scope(scope) -> CradleUser | None:
    """Return the user for the access-token cookie on a WebSocket scope, or None."""
    cookie_header = dict(scope.get("headers") or []).get(b"cookie", b"").decode("latin-1")
    token = parse_cookie(cookie_header).get(getattr(settings, "JWT_ACCESS_COOKIE_NAME", "access_token"))
    if not isinstance(token, str) or not token:
        return None
    auth = JWTAuthentication()
    try:
        return auth.get_user(auth.get_validated_token(token))
    except InvalidToken, TokenError, AuthenticationFailed:
        return None


class APIKeyAuthentication(BaseAuthentication):
    """API Key based authentication.

    Clients should include the API key in the Api-Key header as the raw key value.
    """

    def authenticate(self, request):
        auth_header = request.headers.get("Api-Key")
        if not auth_header:
            return None

        key = auth_header.encode()
        users_with_keys = CradleUser.objects.exclude(api_key__isnull=True).exclude(api_key="")

        for user in users_with_keys:
            if bcrypt.checkpw(key, user.api_key.encode()):
                return (user, None)

        raise AuthenticationFailed(detail="The API key is not valid.")
