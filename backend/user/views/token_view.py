"""Token obtain, refresh, and logout views with session tracking and cookie support."""

import logging

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
from ..utils.tokens import (
    clear_token_cookies,
    current_refresh_jti,
    record_session,
    set_token_cookies,
    token_expires_at,
)

logger = logging.getLogger(__name__)


@extend_schema_view(
    post=extend_schema(
        operation_id="auth_login_create",
        description="Obtain a new pair of access and refresh tokens by providing valid user credentials. If 2FA is enabled for the user, an otp must be provided.",  # noqa: E501
        request=TokenObtainSerializer,
        auth=[],
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

        if user.two_factor_enabled:
            if "otp" not in request.data:
                raise TwoFactorRequiredException(detail="A two-factor authentication code is required.")

            if not user.verify_otp(request.data["otp"]):
                raise InvalidTwoFactorCodeException(detail="The two-factor authentication code is invalid.")

        access_token = AccessToken(serializer.validated_data["access"])
        access_expires_at = token_expires_at(access_token)

        refresh_token = RefreshToken(serializer.validated_data["refresh"])
        refresh_expires_at = token_expires_at(refresh_token)

        response_data = {
            "role": user.role,
            "user_id": str(user.id),
            "access_expires_at": access_expires_at,
            "refresh_expires_at": refresh_expires_at,
        }

        record_session(request, user, refresh_token)

        response = Response(response_data, status=status.HTTP_200_OK)

        set_token_cookies(response, serializer.validated_data["access"], serializer.validated_data["refresh"])
        get_token(request)

        return response


@extend_schema_view(
    post=extend_schema(
        operation_id="auth_refresh_create",
        summary="Refresh Access Token",
        description="Refresh the access token using the refresh token cookie.",
        request=None,
        auth=[],
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
        refresh_name = settings.JWT_REFRESH_COOKIE_NAME
        refresh_token_str = request.COOKIES.get(refresh_name)
        if not refresh_token_str:
            raise UnauthenticatedException(detail="Your session could not be renewed. Please sign in again.")

        request._full_data = {"refresh": refresh_token_str}

        try:
            old_refresh_token = RefreshToken(refresh_token_str)
            jti = old_refresh_token.get("jti")
            if jti and BlacklistedToken.is_blacklisted(jti):
                raise SessionRenewalFailedException(detail="This session has ended. Please sign in again.")
            sid = old_refresh_token.get("sid")
            if not sid or not UserSession.objects.filter(id=sid).exists():
                raise SessionRenewalFailedException(detail="This session has ended. Please sign in again.")
        except TokenError, InvalidToken:
            raise SessionRenewalFailedException(detail="Your session could not be renewed. Please sign in again.")
        except (ValueError, TypeError, AttributeError) as e:
            logger.debug("Could not parse refresh token for blacklist check: %s", e)

        try:
            response = super().post(request, *args, **kwargs)
        except TokenError, InvalidToken:
            raise SessionRenewalFailedException(detail="Your session could not be renewed. Please sign in again.")

        if response.status_code == 200:
            old_refresh_token = RefreshToken(refresh_token_str)
            role = old_refresh_token.get("role", "")
            old_expires_at = token_expires_at(old_refresh_token)
            if not BlacklistedToken.blacklist_token(old_refresh_token["jti"], old_expires_at):
                raise SessionRenewalFailedException(detail="This session has ended. Please sign in again.")

            access_token_str = response.data.pop("access")
            new_refresh_token_str = response.data.pop("refresh")
            new_refresh_token = RefreshToken(new_refresh_token_str)

            access_token = AccessToken(access_token_str)
            access_expires_at = token_expires_at(access_token)
            refresh_expires_at = token_expires_at(new_refresh_token)

            response.data["role"] = role
            response.data["access_expires_at"] = access_expires_at
            response.data["refresh_expires_at"] = refresh_expires_at

            set_token_cookies(response, access_token_str, new_refresh_token_str)

            try:
                jwt_auth = JWTAuthentication()
                user = jwt_auth.get_user(old_refresh_token)

                # Updates the session row in place (same sid), so its sockets stay open.
                record_session(request, user, new_refresh_token)
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
        auth=[],
        responses={
            204: {"description": "Successfully logged out"},
            **get_common_error_responses(),
        },
        summary="Logout",
        tags=["auth"],
    ),
)
class LogoutView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [AuthRateThrottle]

    def post(self, request: Request) -> Response:
        jti = current_refresh_jti(request)
        if jti:
            UserSession.objects.filter(refresh_token_jti=jti).revoke()
        return clear_token_cookies(Response(status=status.HTTP_204_NO_CONTENT))
