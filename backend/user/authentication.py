from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from .models import CradleUser


class APIKeyAuthentication(BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Api-Key "):
            return None

        key = auth_header.split(" ", 1)[1]
        try:
            user = CradleUser.objects.get(api_key=key)
        except CradleUser.DoesNotExist:
            raise AuthenticationFailed("Invalid API Key")

        return (user, None)
