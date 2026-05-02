"""OpenAPI authentication scheme extensions for DRF Spectacular."""

from django.conf import settings
from drf_spectacular.extensions import OpenApiAuthenticationExtension
from drf_spectacular.plumbing import build_bearer_security_scheme_object
from rest_framework_simplejwt.settings import api_settings as jwt_api_settings


class JWTBearerAuthenticationScheme(OpenApiAuthenticationExtension):
    """Documents SimpleJWT bearer auth (overrides Spectacular contrib default wording)."""

    target_class = "rest_framework_simplejwt.authentication.JWTAuthentication"
    name = "JwtAuth"
    priority = 1

    def get_security_definition(self, auto_schema):
        scheme = build_bearer_security_scheme_object(
            header_name=getattr(jwt_api_settings, "AUTH_HEADER_NAME", "HTTP_AUTHORIZATION"),
            token_prefix=jwt_api_settings.AUTH_HEADER_TYPES[0],
            bearer_format="JWT",
        )
        scheme["description"] = (
            "JWT access token in the Authorization header (typical for API clients and the SPA). "
            "Obtain tokens via POST /auth/login/ or refresh via POST /auth/refresh/."
        )
        return scheme


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
            "description": (
                "JWT access token in an HttpOnly cookie after POST /auth/login/ when using cookie-based "
                "sessions. Not used by the documented API routes (they use JwtAuth and/or ApiKey); "
                "unsafe methods require CSRF when this scheme applies."
            ),
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
