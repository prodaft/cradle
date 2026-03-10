"""OpenAPI authentication scheme extensions for DRF Spectacular."""

from django.conf import settings
from drf_spectacular.extensions import OpenApiAuthenticationExtension


class CookieJWTAuthenticationScheme(OpenApiAuthenticationExtension):
    """OpenAPI scheme for JWT in HttpOnly cookie authentication."""

    target_class = "user.authentication.CookieJWTAuthentication"
    name = "CookieJWT"

    def get_security_requirement(self, auto_schema):
        return {"CookieJWT": []}

    def get_security_definition(self, auto_schema):
        cookie_name = getattr(settings, "JWT_ACCESS_COOKIE_NAME", "access_token")
        return {
            "type": "apiKey",
            "in": "cookie",
            "name": cookie_name,
            "description": "JWT access token in HttpOnly cookie. Obtain via POST /auth/login/.",
        }


class APIKeyAuthenticationScheme(OpenApiAuthenticationExtension):
    """OpenAPI scheme for Api-Key header authentication."""

    target_class = "user.authentication.APIKeyAuthentication"
    name = "ApiKey"

    def get_security_requirement(self, auto_schema):
        return {"ApiKey": []}

    def get_security_definition(self, auto_schema):
        return {
            "type": "apiKey",
            "in": "header",
            "name": "Api-Key",
            "description": "API key in header. Obtain via POST /users/me/api-key/ when authenticated.",
        }
