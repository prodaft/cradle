"""Token obtain, refresh, and logout views with session tracking and cookie support."""

import logging
from datetime import datetime, timezone

from django.conf import settings
from django.db import DatabaseError, IntegrityError
from django.middleware.csrf import get_token
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import status
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.tokens import AccessToken, RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from core.exceptions import UnauthenticatedException
from core.openapi import get_common_error_responses, get_error_responses
from core.throttling import AuthRateThrottle

from ..exceptions import (
    AccountNotActivatedException,
    EmailNotConfirmedException,
    InvalidTwoFactorCodeException,
    SessionRenewalFailedException,
    SignInFailedException,
    TwoFactorRequiredException,
    UserErrorCodes,
)
from ..models import BlacklistedToken, UserSession
from ..serializers import TokenObtainSerializer, TokenPairRetrieveSerializer

logger = logging.getLogger(__name__)


def _cookie_kwargs():
    """Return cookie options (httponly, secure, samesite, domain, path) from settings."""
    return dict(
        httponly=True,
        secure=getattr(settings, "JWT_COOKIE_SECURE", True),
        samesite=getattr(settings, "JWT_COOKIE_SAMESITE", "Lax"),
        domain=getattr(settings, "JWT_COOKIE_DOMAIN", None),
        path=getattr(settings, "JWT_COOKIE_PATH", "/"),
    )


def set_token_cookies(response, access, refresh, access_max_age, refresh_max_age):
    """Set HttpOnly JWT cookies on the response."""
    access_name = getattr(settings, "JWT_ACCESS_COOKIE_NAME", "access_token")
    refresh_name = getattr(settings, "JWT_REFRESH_COOKIE_NAME", "refresh_token")
    kwargs = _cookie_kwargs()
    response.set_cookie(access_name, access, max_age=access_max_age, **kwargs)
    response.set_cookie(refresh_name, refresh, max_age=refresh_max_age, **kwargs)
    return response


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
    return user_agent[:255]


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


@extend_schema_view(
    post=extend_schema(
        operation_id="auth_login_create",
        description="Obtain a new pair of access and refresh tokens by providing valid user credentials. If 2FA is enabled for the user, a two_factor_token must be provided.",  # noqa: E501
        request=TokenObtainSerializer,
        responses={
            200: TokenPairRetrieveSerializer,
            **get_error_responses(
                UserErrorCodes.EMAIL_NOT_CONFIRMED,
                UserErrorCodes.ACCOUNT_NOT_ACTIVATED,
                UserErrorCodes.TWO_FACTOR_REQUIRED,
                UserErrorCodes.INVALID_TWO_FACTOR_CODE,
                UserErrorCodes.SIGN_IN_FAILED,
                include_validation_error=True,
            ),
            **get_common_error_responses(),
        },
        summary="Obtain JWT Pair",
        tags=["auth"],
    ),
)
class TokenObtainPairLogView(TokenObtainPairView):
    serializer_class = TokenObtainSerializer
    throttle_classes = [AuthRateThrottle]

    def post(self, request: Request, *args, **kwargs) -> Response:
        serializer: TokenObtainSerializer = self.get_serializer(data=request.data)

        try:
            serializer.is_valid(raise_exception=True)
        except TokenError as e:
            logger.debug("Token validation failed during sign-in: %s", e)
            raise SignInFailedException(detail="Email or password is incorrect.")
        except AuthenticationFailed:
            raise SignInFailedException(detail="Email or password is incorrect.")

        user = serializer.user

        if not user.email_confirmed:
            raise EmailNotConfirmedException(detail="Your email is not confirmed.")

        if not user.is_active:
            raise AccountNotActivatedException(detail="Your account is not activated.")

        # Check if 2FA is enabled
        if user.two_factor_enabled:
            # If no 2FA token provided, return a special response
            if "two_factor_token" not in request.data:
                raise TwoFactorRequiredException(detail="A two-factor authentication code is required.")

            # Verify 2FA token
            if not user.verify_2fa_token(request.data["two_factor_token"]):
                raise InvalidTwoFactorCodeException(detail="The two-factor authentication code is invalid.")

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

        response = Response(response_data, status=status.HTTP_200_OK)

        access_max_age = int(settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"].total_seconds())
        refresh_max_age = int(settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds())
        set_token_cookies(
            response,
            serializer.validated_data["access"],
            serializer.validated_data["refresh"],
            access_max_age,
            refresh_max_age,
        )
        get_token(request)

        return response


@extend_schema_view(
    post=extend_schema(
        operation_id="auth_refresh_create",
        summary="Refresh Access Token",
        description="Refresh the access token using a valid refresh token.",
        request=TokenRefreshSerializer,
        responses={
            200: TokenPairRetrieveSerializer,
            **get_error_responses(
                UserErrorCodes.SESSION_RENEWAL_FAILED,
                include_validation_error=True,
            ),
            **get_common_error_responses(),
        },
        tags=["auth"],
    ),
)
class TokenRefreshLogView(TokenRefreshView):
    throttle_classes = [AuthRateThrottle]

    def post(self, request: Request, *args, **kwargs) -> Response:
        # Fall back to the refresh cookie if the body doesn't contain a token
        refresh_name = getattr(settings, "JWT_REFRESH_COOKIE_NAME", "refresh_token")
        refresh_token_str = request.data.get("refresh") or request.COOKIES.get(refresh_name)
        if not refresh_token_str:
            raise UnauthenticatedException(detail="Your session could not be renewed. Please sign in again.")

        # Inject into request data so the parent serializer sees it
        request._full_data = {**request.data, "refresh": refresh_token_str}

        # Check if the refresh token is blacklisted before processing
        try:
            old_refresh_token = RefreshToken(refresh_token_str)
            jti = old_refresh_token.get("jti")
            if jti and BlacklistedToken.is_blacklisted(jti):
                raise SessionRenewalFailedException(detail="This session has ended. Please sign in again.")
        except (TokenError, InvalidToken):
            raise SessionRenewalFailedException(detail="Your session could not be renewed. Please sign in again.")
        except (ValueError, TypeError, AttributeError) as e:
            logger.debug("Could not parse refresh token for blacklist check: %s", e)

        try:
            response = super().post(request, *args, **kwargs)
        except (TokenError, InvalidToken):
            raise SessionRenewalFailedException(detail="Your session could not be renewed. Please sign in again.")

        if response.status_code == 200:
            old_refresh_token = RefreshToken(refresh_token_str)
            role = old_refresh_token.get("role", "")

            access_token = AccessToken(response.data["access"])
            access_expires_at = datetime.fromtimestamp(access_token["exp"], tz=timezone.utc)

            new_refresh_token_str = response.data.get("refresh", refresh_token_str)
            new_refresh_token = RefreshToken(new_refresh_token_str)
            refresh_expires_at = datetime.fromtimestamp(new_refresh_token["exp"], tz=timezone.utc)

            response.data["role"] = role
            response.data["access_expires_at"] = access_expires_at
            response.data["refresh_expires_at"] = refresh_expires_at

            # Set updated cookies
            access_max_age = int(settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"].total_seconds())
            refresh_max_age = int(settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds())
            set_token_cookies(
                response,
                response.data["access"],
                new_refresh_token_str,
                access_max_age,
                refresh_max_age,
            )

            try:
                jwt_auth = JWTAuthentication()
                user = jwt_auth.get_user(old_refresh_token)

                old_jti = old_refresh_token.get("jti")
                if old_jti and new_refresh_token_str != refresh_token_str:
                    UserSession.objects.filter(refresh_token_jti=old_jti).delete()
                create_or_update_session(request, user, new_refresh_token, refresh_expires_at)
            except (
                TokenError,
                InvalidToken,
                AuthenticationFailed,
                IntegrityError,
                DatabaseError,
            ) as e:
                logger.warning("Session update failed during token refresh: %s", e)

        return response


@extend_schema_view(
    post=extend_schema(
        description="Log out by blacklisting the refresh token, removing the session, and clearing JWT cookies.",
        request=None,
        operation_id="auth_logout_create",
        responses={
            204: {"description": "Successfully logged out"},
            **get_common_error_responses(),
        },
        summary="Logout",
        tags=["auth"],
    ),
)
class LogoutView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [AuthRateThrottle]

    def post(self, request: Request) -> Response:
        refresh_cookie_name = getattr(settings, "JWT_REFRESH_COOKIE_NAME", "refresh_token")
        refresh_token_str = request.COOKIES.get(refresh_cookie_name)
        if refresh_token_str:
            try:
                token = RefreshToken(refresh_token_str)
                jti = token.get("jti")
                exp = datetime.fromtimestamp(token["exp"], tz=timezone.utc)
                if jti:
                    BlacklistedToken.blacklist_token(jti, exp)
                    UserSession.objects.filter(refresh_token_jti=jti).delete()
            except Exception:
                pass

        access_name = getattr(settings, "JWT_ACCESS_COOKIE_NAME", "access_token")
        response = Response(status=status.HTTP_204_NO_CONTENT)
        kwargs = _cookie_kwargs()
        response.delete_cookie(
            access_name,
            path=kwargs["path"],
            domain=kwargs.get("domain"),
            samesite=kwargs["samesite"],
        )
        response.delete_cookie(
            refresh_cookie_name,
            path=kwargs["path"],
            domain=kwargs.get("domain"),
            samesite=kwargs["samesite"],
        )
        return response
