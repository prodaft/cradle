"""JWT cookie and API key authentication backends."""

import bcrypt
from django.conf import settings
from django.middleware.csrf import CsrfViewMiddleware
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.authentication import JWTAuthentication

from .models import CradleUser


class CookieJWTAuthentication(JWTAuthentication):
    """Read access JWT from HttpOnly cookie instead of Authorization header.

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
            raise AuthenticationFailed(f"CSRF Failed: {reason}")


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

        raise AuthenticationFailed("Invalid API Key")
