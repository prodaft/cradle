"""OAuth connect, login, and disconnect views."""

from datetime import datetime
from datetime import timezone as dt_timezone
from urllib.parse import urlsplit, urlunsplit

import requests
from django.conf import settings
from django.middleware.csrf import get_token
from django.utils import timezone
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.tokens import RefreshToken

from core.exceptions import ValidationException
from core.openapi import get_common_error_responses, get_error_responses
from core.throttling import AuthRateThrottle

from ..exceptions import (
    AccountNotActivatedException,
    EmailNotConfirmedException,
    ExternalIdentityConflictException,
    UserErrorCodes,
)
from ..models import ExternalIdentity
from ..serializers import (
    OAuthConnectSerializer,
    TokenObtainSerializer,
    TokenPairRetrieveSerializer,
)
from .token_view import create_or_update_session, set_token_cookies


def _get_provider_config(provider: str) -> dict | None:
    """Return OAuth provider config dict or None if not configured."""
    config = settings.OAUTH_PROVIDERS.get(provider)
    if isinstance(config, dict):
        return config
    return None


def _exchange_code_for_userinfo(provider: str, code: str, redirect_uri: str) -> tuple[dict, dict]:
    """Exchange OAuth code for tokens and fetch userinfo. Returns (token_data, userinfo)."""
    config = _get_provider_config(provider)
    if not config:
        raise ValidationException(detail="OAuth provider is not configured.")

    token_url = config.get("token_url")
    userinfo_url = config.get("userinfo_url")
    if not token_url or not userinfo_url:
        raise ValidationException(detail="OAuth provider configuration is incomplete.")

    sanitized_redirect_uri = urlunsplit(urlsplit(redirect_uri)._replace(fragment=""))

    token_payload = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": sanitized_redirect_uri,
    }

    client_id = config.get("client_id")
    client_secret = config.get("client_secret")
    if client_id:
        token_payload["client_id"] = client_id
    if client_secret:
        token_payload["client_secret"] = client_secret

    try:
        token_response = requests.post(token_url, data=token_payload, timeout=10)
    except requests.RequestException as exc:
        raise ValidationException(detail="Failed to reach OAuth provider.") from exc

    if not token_response.ok:
        raise ValidationException(
            detail=f"OAuth token exchange failed ({token_response.status_code}): {token_response.text}"
        )

    token_data = token_response.json()
    access_token = token_data.get("access_token")
    if not access_token:
        raise ValidationException(detail="OAuth provider did not return access token.")

    try:
        userinfo_response = requests.get(
            userinfo_url,
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=10,
        )
    except requests.RequestException as exc:
        raise ValidationException(detail="Failed to fetch OAuth user info.") from exc

    if not userinfo_response.ok:
        raise ValidationException(
            detail=f"OAuth user info request failed ({userinfo_response.status_code}): {userinfo_response.text}"
        )

    return token_data, userinfo_response.json()


@extend_schema_view(
    post=extend_schema(
        operation_id="users_oauth_connect",
        summary="Connect OAuth provider",
        request=OAuthConnectSerializer,
        responses={
            200: None,
            **get_error_responses(
                UserErrorCodes.EXTERNAL_IDENTITY_CONFLICT,
                include_validation_error=True,
            ),
            **get_common_error_responses(),
        },
    ),
)
class OAuthConnectView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request: Request) -> Response:
        serializer = OAuthConnectSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        provider = data["provider"]
        _, userinfo = _exchange_code_for_userinfo(provider, data["code"], data["redirect_uri"])
        subject = userinfo.get("sub")
        if not subject:
            raise ValidationException(detail="OAuth user info missing subject.")

        issuer = userinfo.get("iss") or settings.OAUTH_PROVIDERS.get(provider, {}).get("issuer")
        email = userinfo.get("email")
        email_verified = bool(userinfo.get("email_verified"))
        display_name = userinfo.get("name") or userinfo.get("preferred_username")

        existing = ExternalIdentity.objects.filter(provider=provider, subject=subject, issuer=issuer).first()

        if existing and existing.user_id != request.user.id:
            raise ExternalIdentityConflictException(detail="This external account is already linked to another user.")

        if not existing:
            existing = ExternalIdentity(
                user=request.user,
                provider=provider,
                subject=subject,
                issuer=issuer,
            )

        existing.email = email
        existing.email_verified = email_verified
        existing.display_name = display_name
        existing.raw_claims = userinfo
        existing.last_login_at = timezone.now()
        existing.save()

        return Response(
            {
                "provider": provider,
                "connected": True,
                "connected_at": timezone.now().isoformat(),
            }
        )


@extend_schema_view(
    post=extend_schema(
        operation_id="auth_oauth_login",
        summary="Login with OAuth provider",
        request=OAuthConnectSerializer,
        responses={
            200: TokenPairRetrieveSerializer,
            **get_error_responses(
                UserErrorCodes.EMAIL_NOT_CONFIRMED,
                UserErrorCodes.ACCOUNT_NOT_ACTIVATED,
                include_validation_error=True,
            ),
            **get_common_error_responses(),
        },
        tags=["auth"],
    ),
)
class OAuthLoginView(APIView):
    authentication_classes = []
    permission_classes = []
    throttle_classes = [AuthRateThrottle]

    def post(self, request: Request) -> Response:
        serializer = OAuthConnectSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        provider = data["provider"]
        _, userinfo = _exchange_code_for_userinfo(provider, data["code"], data["redirect_uri"])

        subject = userinfo.get("sub")
        if not subject:
            raise ValidationException(detail="OAuth user info missing subject.")

        issuer = userinfo.get("iss") or settings.OAUTH_PROVIDERS.get(provider, {}).get("issuer")

        identity = (
            ExternalIdentity.objects.select_related("user")
            .filter(provider=provider, subject=subject, issuer=issuer)
            .first()
        )

        if not identity:
            raise ValidationException(detail="External account is not linked to any user.")

        user = identity.user

        if not user.email_confirmed:
            raise EmailNotConfirmedException(detail="Your email is not confirmed")

        if not user.is_active:
            raise AccountNotActivatedException(detail="Your account is not activated")

        identity.last_login_at = timezone.now()
        identity.save(update_fields=["last_login_at"])

        refresh: RefreshToken = TokenObtainSerializer.get_token(user)
        access_token = refresh.access_token

        access_expires_at = datetime.fromtimestamp(access_token["exp"], tz=dt_timezone.utc)
        refresh_expires_at = datetime.fromtimestamp(refresh["exp"], tz=dt_timezone.utc)

        response_data = {
            "access": str(access_token),
            "refresh": str(refresh),
            "role": user.role,
            "access_expires_at": access_expires_at,
            "refresh_expires_at": refresh_expires_at,
            "user_id": str(user.id),
        }

        create_or_update_session(request, user, refresh, refresh_expires_at)

        response = Response(response_data)

        access_max_age = int(settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"].total_seconds())
        refresh_max_age = int(settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds())
        set_token_cookies(response, str(access_token), str(refresh), access_max_age, refresh_max_age)
        get_token(request)

        return response


@extend_schema_view(
    delete=extend_schema(
        operation_id="users_oauth_disconnect",
        summary="Disconnect OAuth provider",
        responses={
            204: None,
            **get_common_error_responses(),
        },
    ),
)
class OAuthDisconnectView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def delete(self, request: Request, provider: str) -> Response:
        ExternalIdentity.objects.filter(user=request.user, provider=provider).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
