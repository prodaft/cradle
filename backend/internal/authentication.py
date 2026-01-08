import hashlib
import hmac
import time

from django.conf import settings
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed


class CollabHmacAuthentication(BaseAuthentication):
    """
    Validate internal collab requests signed with HMAC.
    """

    def authenticate(self, request):
        timestamp = request.headers.get("X-Collab-Timestamp")
        signature = request.headers.get("X-Collab-Signature")

        if not timestamp or not signature:
            raise AuthenticationFailed("Missing collab signature headers")

        try:
            timestamp_value = int(timestamp)
        except ValueError as exc:
            raise AuthenticationFailed("Invalid collab timestamp") from exc

        now = int(time.time())
        max_skew = getattr(settings, "COLLAB_HMAC_MAX_SKEW_SECONDS", 60)
        if abs(now - timestamp_value) > max_skew:
            raise AuthenticationFailed("Collab signature expired")

        secret = getattr(settings, "COLLAB_HMAC_SECRET", "")
        if not secret:
            raise AuthenticationFailed("Collab secret not configured")

        body = request.body.decode("utf-8") if request.body else ""
        path = request.get_full_path()
        message = f"{timestamp}.{request.method.upper()}.{path}.{body}"
        expected = hmac.new(
            secret.encode("utf-8"),
            message.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()

        if not hmac.compare_digest(expected, signature):
            raise AuthenticationFailed("Invalid collab signature")

        return (None, {"service": "collab"})
