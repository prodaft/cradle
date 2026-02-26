import bcrypt
from django.conf import settings
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.authentication import JWTAuthentication
from .models import CradleUser


class CookieJWTAuthentication(JWTAuthentication):
    """Read the access JWT from an HttpOnly cookie instead of the Authorization header.
    Enforces CSRF for unsafe methods since cookies are sent automatically."""

    def authenticate(self, request):
        cookie_name = getattr(settings, "JWT_ACCESS_COOKIE_NAME", "access_token")
        raw_token = request.COOKIES.get(cookie_name)
        if not raw_token:
            return None
        self.enforce_csrf(request)
        validated_token = self.get_validated_token(raw_token)
        return self.get_user(validated_token), validated_token

    def enforce_csrf(self, request):
        if request.method in ("GET", "HEAD", "OPTIONS", "TRACE"):
            return
        from django.middleware.csrf import CsrfViewMiddleware

        class CSRFCheck(CsrfViewMiddleware):
            def _reject(self, request, reason):
                return reason

        reason = CSRFCheck(lambda req: None).process_view(request, None, (), {})
        if reason:
            raise AuthenticationFailed(f"CSRF Failed: {reason}")


class APIKeyAuthentication(BaseAuthentication):
    """
    API Key based authentication.

    Clients should include the API key in the Authorization header.
    Format: 'Api-Key <api_key>'
    """

    def authenticate(self, request):
        auth_header = request.headers.get("Api-Key")
        if auth_header is None:
            return None

        key = auth_header.encode()

        # Iterate through all users with an API key set
        for user in CradleUser.objects.exclude(api_key__isnull=True):
            if user.api_key and bcrypt.checkpw(key, user.api_key.encode()):
                return (user, None)

        raise AuthenticationFailed("Invalid API Key")
