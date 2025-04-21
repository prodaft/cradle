import bcrypt
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from .models import CradleUser


class APIKeyAuthentication(BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Api-Key "):
            return None

        key = auth_header.split(" ", 1)[1].encode()

        # Iterate through all users with an API key set
        for user in CradleUser.objects.exclude(api_key__isnull=True):
            if user.api_key and bcrypt.checkpw(key, user.api_key.encode()):
                return (user, None)

        raise AuthenticationFailed("Invalid API Key")
