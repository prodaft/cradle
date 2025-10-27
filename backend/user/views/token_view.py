from datetime import datetime, timezone

from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import status
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.tokens import AccessToken, RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from ..serializers import (
    TokenObtainSerializer,
    TokenPairRetrieveSerializer,
    TokenRefreshRetrieveSerializer,
)


class TokenObtainPairLogView(TokenObtainPairView):
    serializer_class = TokenObtainSerializer

    @extend_schema(
        description="Obtain a new pair of access and refresh tokens by providing valid user credentials. If 2FA is enabled for the user, a two_factor_token must be provided.",  # noqa: E501
        request=TokenObtainSerializer,
        responses={
            200: TokenPairRetrieveSerializer,
            400: "Bad Request: Invalid credentials",
            401: "Unauthorized: Authentication failed or invalid 2FA token",
        },
        summary="Obtain JWT Pair",
    )
    def post(self, request: Request, *args, **kwargs) -> Response:
        serializer: TokenObtainSerializer = self.get_serializer(data=request.data)

        try:
            serializer.is_valid(raise_exception=True)
        except TokenError as e:
            raise InvalidToken(e.args[0])

        user = serializer.user

        if not user.email_confirmed:
            return Response(
                "Your email is not confirmed", status=status.HTTP_401_UNAUTHORIZED
            )

        if not user.is_active:
            return Response(
                "Your account is not activated", status=status.HTTP_401_UNAUTHORIZED
            )

        # Check if 2FA is enabled
        if user.two_factor_enabled:
            # If no 2FA token provided, return a special response
            if "two_factor_token" not in request.data:
                return Response(
                    {"requires_2fa": True, "message": "2FA token required"},
                    status=status.HTTP_401_UNAUTHORIZED,
                )

            # Verify 2FA token
            if not user.verify_2fa_token(request.data["two_factor_token"]):
                return Response(
                    {"error": "Invalid 2FA token"}, status=status.HTTP_401_UNAUTHORIZED
                )

        # Add role and token expiry times to response
        response_data = serializer.validated_data.copy()
        response_data["role"] = user.role

        # Decode access token to get expiry time
        access_token = AccessToken(serializer.validated_data["access"])
        access_expires_at = datetime.fromtimestamp(access_token["exp"], tz=timezone.utc)
        response_data["access_expires_at"] = access_expires_at

        # Decode refresh token to get expiry time
        refresh_token = RefreshToken(serializer.validated_data["refresh"])
        refresh_expires_at = datetime.fromtimestamp(
            refresh_token["exp"], tz=timezone.utc
        )
        response_data["refresh_expires_at"] = refresh_expires_at

        return Response(response_data, status=status.HTTP_200_OK)


@extend_schema_view(
    post=extend_schema(
        summary="Refresh Access Token",
        description="Refresh the access token using a valid refresh token.",
        request=TokenRefreshSerializer,
        responses={
            200: TokenRefreshRetrieveSerializer,
            400: {"description": "Bad Request: Invalid refresh token"},
            401: {"description": "Unauthorized: Refresh token expired or invalid"},
        },
    )
)
class TokenRefreshLogView(TokenRefreshView):
    @extend_schema(
        description="Refresh the access token using a valid refresh token.",
        request=TokenRefreshSerializer,
        responses={
            200: TokenRefreshRetrieveSerializer,
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
            token, along with role, access_expires_at, and refresh_expires_at.
            Response(status=400): If the request body is invalid.
            Response(status=401): If the provided refresh type JSON web
            token is invalid.
        """
        response = super().post(request, *args, **kwargs)

        if response.status_code == 200:
            # Get the refresh token from request
            refresh_token_str = request.data.get("refresh")
            refresh_token = RefreshToken(refresh_token_str)

            # Extract role from the refresh token payload
            role = refresh_token.get("role", "")

            # Get access token expiry time from the newly generated access token
            access_token = AccessToken(response.data["access"])
            access_expires_at = datetime.fromtimestamp(
                access_token["exp"], tz=timezone.utc
            )

            # Get refresh token expiry time
            refresh_expires_at = datetime.fromtimestamp(
                refresh_token["exp"], tz=timezone.utc
            )

            # Add additional fields to response
            response.data["role"] = role
            response.data["access_expires_at"] = access_expires_at
            response.data["refresh_expires_at"] = refresh_expires_at

        return response
