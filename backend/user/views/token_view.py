from datetime import datetime, timezone

from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import status
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.tokens import AccessToken, RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from core.openapi import get_error_responses, get_validation_error_response
from ..exceptions import (
    EmailNotConfirmedException,
    AccountNotActivatedException,
    TwoFactorRequiredException,
    InvalidTwoFactorTokenException,
    UserErrorCodes,
)
from ..models import BlacklistedToken, UserSession
from ..serializers import (
    TokenObtainSerializer,
    TokenPairRetrieveSerializer,
    TokenRefreshRetrieveSerializer,
)


def get_client_ip(request: Request) -> str:
    """Extract client IP address from request."""
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        ip = x_forwarded_for.split(",")[0]
    else:
        ip = request.META.get("REMOTE_ADDR", "")
    return ip


def get_device_info(request: Request) -> str:
    """Extract device/browser information from request."""
    user_agent = request.META.get("HTTP_USER_AGENT", "Unknown")
    # Truncate to max length
    return user_agent[:255] if len(user_agent) > 255 else user_agent


def create_or_update_session(request: Request, user, refresh_token: RefreshToken, expires_at: datetime):
    """Create or update a session record for a user."""
    jti = refresh_token.get("jti")
    if not jti:
        return

    device_info = get_device_info(request)
    ip_address = get_client_ip(request)

    UserSession.objects.update_or_create(
        refresh_token_jti=jti,
        defaults={
            "user": user,
            "device_info": device_info,
            "ip_address": ip_address,
            "expires_at": expires_at,
        },
    )


class TokenObtainPairLogView(TokenObtainPairView):
    serializer_class = TokenObtainSerializer

    @extend_schema(
        description="Obtain a new pair of access and refresh tokens by providing valid user credentials. If 2FA is enabled for the user, a two_factor_token must be provided.",  # noqa: E501
        request=TokenObtainSerializer,
        responses={
            200: TokenPairRetrieveSerializer,
            **get_validation_error_response(),
            **get_error_responses(
                UserErrorCodes.EMAIL_NOT_CONFIRMED,
                UserErrorCodes.ACCOUNT_NOT_ACTIVATED,
                UserErrorCodes.TWO_FACTOR_REQUIRED,
                UserErrorCodes.INVALID_TWO_FACTOR_TOKEN,
            ),
        },
        summary="Obtain JWT Pair",
        tags=["auth"],
    )
    def post(self, request: Request, *args, **kwargs) -> Response:
        serializer: TokenObtainSerializer = self.get_serializer(data=request.data)

        try:
            serializer.is_valid(raise_exception=True)
        except TokenError as e:
            raise InvalidToken(e.args[0])

        user = serializer.user

        if not user.email_confirmed:
            raise EmailNotConfirmedException(detail="Your email is not confirmed")

        if not user.is_active:
            raise AccountNotActivatedException(detail="Your account is not activated")

        # Check if 2FA is enabled
        if user.two_factor_enabled:
            # If no 2FA token provided, return a special response
            if "two_factor_token" not in request.data:
                raise TwoFactorRequiredException(detail="2FA token required")

            # Verify 2FA token
            if not user.verify_2fa_token(request.data["two_factor_token"]):
                raise InvalidTwoFactorTokenException(detail="Invalid 2FA token")

        # Add role and token expiry times to response
        response_data = serializer.validated_data.copy()
        response_data["role"] = user.role

        # Decode access token to get expiry time
        access_token = AccessToken(serializer.validated_data["access"])
        access_expires_at = datetime.fromtimestamp(access_token["exp"], tz=timezone.utc)
        response_data["access_expires_at"] = access_expires_at

        # Decode refresh token to get expiry time
        refresh_token = RefreshToken(serializer.validated_data["refresh"])
        refresh_expires_at = datetime.fromtimestamp(refresh_token["exp"], tz=timezone.utc)
        response_data["refresh_expires_at"] = refresh_expires_at

        # Create session record
        create_or_update_session(request, user, refresh_token, refresh_expires_at)

        return Response(response_data, status=status.HTTP_200_OK)


@extend_schema_view(
    post=extend_schema(
        summary="Refresh Access Token",
        description="Refresh the access token using a valid refresh token.",
        request=TokenRefreshSerializer,
        responses={
            200: TokenRefreshRetrieveSerializer,
            **get_validation_error_response(),
        },
        tags=["auth"],
    )
)
class TokenRefreshLogView(TokenRefreshView):
    @extend_schema(
        description="Refresh the access token using a valid refresh token.",
        request=TokenRefreshSerializer,
        responses={
            200: TokenRefreshRetrieveSerializer,
            **get_validation_error_response(),
        },
        summary="Refresh Access Token",
        tags=["auth"],
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
        # Check if the refresh token is blacklisted before processing
        refresh_token_str = request.data.get("refresh")
        if refresh_token_str:
            try:
                old_refresh_token = RefreshToken(refresh_token_str)
                jti = old_refresh_token.get("jti")
                if jti and BlacklistedToken.is_blacklisted(jti):
                    raise InvalidToken("Token has been revoked")
            except (TokenError, InvalidToken):
                # Re-raise token errors
                raise
            except Exception:
                # If we can't decode the token, let the parent class handle it
                pass

        response = super().post(request, *args, **kwargs)

        if response.status_code == 200:
            # Get the refresh token from request
            refresh_token_str = request.data.get("refresh")
            old_refresh_token = RefreshToken(refresh_token_str)

            # Extract role from the refresh token payload
            role = old_refresh_token.get("role", "")

            # Get access token expiry time from the newly generated access token
            access_token = AccessToken(response.data["access"])
            access_expires_at = datetime.fromtimestamp(access_token["exp"], tz=timezone.utc)

            # Get new refresh token (if rotated) or use old one
            new_refresh_token_str = response.data.get("refresh", refresh_token_str)
            new_refresh_token = RefreshToken(new_refresh_token_str)

            # Get refresh token expiry time
            refresh_expires_at = datetime.fromtimestamp(new_refresh_token["exp"], tz=timezone.utc)

            # Add additional fields to response
            response.data["role"] = role
            response.data["access_expires_at"] = access_expires_at
            response.data["refresh_expires_at"] = refresh_expires_at

            # Update session record with new refresh token (if rotated)
            # Get user from the old refresh token by validating it
            from rest_framework_simplejwt.authentication import JWTAuthentication

            try:
                # Validate the old refresh token to get the user
                jwt_auth = JWTAuthentication()
                validated_token = jwt_auth.get_validated_token(old_refresh_token)
                user = jwt_auth.get_user(validated_token)

                # Delete old session if token was rotated
                old_jti = old_refresh_token.get("jti")
                if old_jti and new_refresh_token_str != refresh_token_str:
                    UserSession.objects.filter(refresh_token_jti=old_jti).delete()
                # Create/update session with new token
                create_or_update_session(request, user, new_refresh_token, refresh_expires_at)
            except Exception:
                pass  # If we can't get the user, skip session tracking

        return response
