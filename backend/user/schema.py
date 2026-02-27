from django.conf import settings
from drf_spectacular.extensions import OpenApiAuthenticationExtension


class CookieJWTAuthenticationScheme(OpenApiAuthenticationExtension):
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
            "description": "JWT access token in HttpOnly cookie. Obtain via /api/auth/login/.",
        }


class APIKeyAuthenticationScheme(OpenApiAuthenticationExtension):
    target_class = "user.authentication.APIKeyAuthentication"
    name = "ApiKey"

    def get_security_requirement(self, auto_schema):
        return {"ApiKey": []}

    def get_security_definition(self, auto_schema):
        return {
            "type": "apiKey",
            "in": "header",
            "name": "Api-Key",
            "description": "API key authentication. The value must be prefixed with 'Api-Key '.",
        }
