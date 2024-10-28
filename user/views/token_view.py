from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework.request import Request
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema
from rest_framework_simplejwt.serializers import (
    TokenObtainPairSerializer,
    TokenRefreshSerializer,
)


class TokenObtainPairLogView(TokenObtainPairView):
    @extend_schema(
        description="Obtain a new pair of access and refresh tokens by providing valid user credentials.",
        request=TokenObtainPairSerializer,
        responses={
            200: TokenObtainPairSerializer,
            400: "Bad Request: Invalid credentials",
            401: "Unauthorized: Authentication failed",
        },
        summary="Obtain JWT Pair",
    )
    def post(self, request: Request, *args, **kwargs) -> Response:
        response = super().post(request, *args, **kwargs)
        return response


class TokenRefreshLogView(TokenRefreshView):
    @extend_schema(
        description="Refresh the access token using a valid refresh token.",
        request=TokenRefreshSerializer,
        responses={
            200: TokenRefreshSerializer,
            400: "Bad Request: Invalid refresh token",
            401: "Unauthorized: Refresh token expired or invalid",
        },
        summary="Refresh Access Token",
    )
    def post(self, request: Request, *args, **kwargs) -> Response:
        """Takes a refresh type JSON web token and returns an access type
        JSON web token if the refresh token is valid.

        Args:
            request (Request): The HTTP request object. Request.data JSON
            should contain a "refresh" artifact with a refresh type JSON web
            token.

        Returns:
            Response(body, status=200): If the request is successful. The
            body has a field "access" with the new access type JSON web
            token.
            Response(status=400): If the request body is invalid.
            Response(status=401): If the provided refresh type JSON web
            token is invalid.
        """
        return super().post(request, *args, **kwargs)
