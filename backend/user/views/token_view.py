from rest_framework import status
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework.request import Request
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema
from rest_framework_simplejwt.serializers import (
    TokenObtainPairSerializer,
    TokenRefreshSerializer,
)
from drf_spectacular.utils import extend_schema_view
from ..serializers import Login2FASerializer


@extend_schema_view(
    post=extend_schema(
        summary="Obtain JWT Pair",
        description="Obtain a new pair of access and refresh tokens by providing valid user credentials.",  # noqa: E501
        request=TokenObtainPairSerializer,
        responses={
            200: TokenObtainPairSerializer,
            400: {"description": "Bad Request: Invalid credentials"},
            401: {
                "description": "Unauthorized: Authentication failed or email not confirmed or account not activated"  # noqa: E501
            },
        },
    )
)
class TokenObtainPairLogView(TokenObtainPairView):
    @extend_schema(
        description="Obtain a new pair of access and refresh tokens by providing valid user credentials.",  # noqa: E501
        request=TokenObtainPairSerializer,
        responses={
            200: TokenObtainPairSerializer,
            400: "Bad Request: Invalid credentials",
            401: "Unauthorized: Authentication failed",
        },
        summary="Obtain JWT Pair",
    )
    def post(self, request: Request, *args, **kwargs) -> Response:
        serializer: TokenObtainPairSerializer = self.get_serializer(data=request.data)

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

        return Response(serializer.validated_data, status=status.HTTP_200_OK)


@extend_schema_view(
    post=extend_schema(
        summary="Refresh Access Token",
        description="Refresh the access token using a valid refresh token.",
        request=TokenRefreshSerializer,
        responses={
            200: TokenRefreshSerializer,
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
