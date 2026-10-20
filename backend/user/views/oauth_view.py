"""OAuth connect, login, and disconnect views."""

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
from rest_framework_simplejwt.tokens import RefreshToken

from core.openapi import get_common_error_responses, get_error_responses
from core.throttling import AuthRateThrottle

from ..authentication import CookieJWTAuthentication
from ..exceptions import (
    AccountNotActivatedException,
    AccountNotLinkedException,
    EmailNotConfirmedException,
    ExternalAccountInUseException,
    OAuthSignInFailedException,
    UserErrorCodes,
)
from ..models import ExternalIdentity
from ..serializers import (
    OAuthConnectSerializer,
    TokenObtainSerializer,
    TokenPairRetrieveSerializer,
)
from ..utils.tokens import record_session, set_token_cookies, token_expires_at


def _fetch_identity(provider: str, code: str, redirect_uri: str) -> tuple[str, str | None, dict]:
    """Exchange the OAuth code and return ``(subject, issuer, userinfo)`` of the external account.

    The issuer comes from the userinfo ``iss`` claim, falling back to the provider's configured issuer.
    """
    config = settings.OAUTH_PROVIDERS.get(provider)
    if not isinstance(config, dict):
        raise OAuthSignInFailedException(detail="This sign-in method is not available.")

    token_url = config.get("token_url")
    userinfo_url = config.get("userinfo_url")
    if not token_url or not userinfo_url:
        raise OAuthSignInFailedException(detail="This sign-in method is not set up correctly.")

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
        raise OAuthSignInFailedException(detail="Could not reach the sign-in service.") from exc

    if not token_response.ok:
        raise OAuthSignInFailedException(detail="Sign-in could not be completed. Please try again.")

    token_data = token_response.json()
    access_token = token_data.get("access_token")
    if not access_token:
        raise OAuthSignInFailedException(detail="The sign-in service did not respond as expected.")

    try:
        userinfo_response = requests.get(
            userinfo_url,
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=10,
        )
    except requests.RequestException as exc:
        raise OAuthSignInFailedException(detail="Could not load your profile from the sign-in service.") from exc

    if not userinfo_response.ok:
        raise OAuthSignInFailedException(detail="Could not load your profile from the sign-in service.")

    userinfo = userinfo_response.json()
    subject = userinfo.get("sub")
    if not subject:
        raise OAuthSignInFailedException(detail="Your profile from the sign-in service is incomplete.")
    return subject, userinfo.get("iss") or config.get("issuer"), userinfo


@extend_schema_view(
    post=extend_schema(
        operation_id="users_me_oauth_create",
        summary="Connect OAuth provider",
        request=OAuthConnectSerializer,
        responses={
            200: None,
            **get_error_responses(
                UserErrorCodes.EXTERNAL_ACCOUNT_IN_USE,
                UserErrorCodes.OAUTH_SIGN_IN_FAILED,
                include_validation_error=True,
            ),
            **get_common_error_responses(),
        },
    ),
)
class OAuthConnectView(APIView):
    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request: Request) -> Response:
        serializer = OAuthConnectSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        provider = data["provider"]
        subject, issuer, userinfo = _fetch_identity(provider, data["code"], data["redirect_uri"])
        email = userinfo.get("email")
        email_verified = bool(userinfo.get("email_verified"))
        display_name = userinfo.get("name") or userinfo.get("preferred_username")

        existing = ExternalIdentity.objects.filter(provider=provider, subject=subject, issuer=issuer).first()

        if existing and existing.user_id != request.user.id:
            raise ExternalAccountInUseException(detail="This external account is already linked to another user.")

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
        auth=[],
        responses={
            200: TokenPairRetrieveSerializer,
            **get_error_responses(
                UserErrorCodes.EMAIL_NOT_CONFIRMED,
                UserErrorCodes.ACCOUNT_NOT_ACTIVATED,
                UserErrorCodes.OAUTH_SIGN_IN_FAILED,
                UserErrorCodes.ACCOUNT_NOT_LINKED,
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
        subject, issuer, _ = _fetch_identity(provider, data["code"], data["redirect_uri"])

        identity = (
            ExternalIdentity.objects.select_related("user")
            .filter(provider=provider, subject=subject, issuer=issuer)
            .first()
        )

        if not identity:
            raise AccountNotLinkedException(detail="This external account is not linked to any user.")

        user = identity.user

        if not user.email_confirmed:
            raise EmailNotConfirmedException(detail="Your email is not confirmed.")

        if not user.is_active:
            raise AccountNotActivatedException(detail="Your account is not activated.")

        identity.last_login_at = timezone.now()
        identity.save(update_fields=["last_login_at"])

        refresh: RefreshToken = TokenObtainSerializer.get_token(user)
        access_token = refresh.access_token

        access_expires_at = token_expires_at(access_token)
        refresh_expires_at = token_expires_at(refresh)

        response_data = {
            "role": user.role,
            "access_expires_at": access_expires_at,
            "refresh_expires_at": refresh_expires_at,
            "user_id": str(user.id),
        }

        record_session(request, user, refresh)

        response = Response(response_data)

        set_token_cookies(response, access_token, refresh)
        get_token(request)

        return response


@extend_schema_view(
    delete=extend_schema(
        operation_id="users_me_oauth_destroy",
        summary="Disconnect OAuth provider",
        responses={
            204: None,
            **get_common_error_responses(),
        },
    ),
)
class OAuthDisconnectView(APIView):
    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def delete(self, request: Request, provider: str) -> Response:
        ExternalIdentity.objects.filter(user=request.user, provider=provider).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
