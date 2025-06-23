import bcrypt
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from .models import CradleUser


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
