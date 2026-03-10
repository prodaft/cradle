"""2FA enable, verify, and disable views using django-otp TOTP."""

from django.db import transaction
from django_otp.plugins.otp_totp.models import TOTPDevice
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from core.openapi import get_common_error_responses, get_error_responses

from ..exceptions import (
    InvalidTwoFactorTokenException,
    TwoFactorAlreadyEnabledException,
    TwoFactorNotEnabledException,
    UserErrorCodes,
)
from ..serializers import Enable2FASerializer, Verify2FASerializer


@extend_schema_view(
    post=extend_schema(
        operation_id="users_2fa_enable_create",
        summary="Enable 2FA",
        description="Initiates 2FA setup for the user and returns a QR code URL",
        request=None,
        responses={
            200: Enable2FASerializer,
            **get_error_responses(UserErrorCodes.TWO_FACTOR_ALREADY_ENABLED),
            **get_common_error_responses(),
        },
    )
)
class Enable2FAView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request: Request) -> Response:
        if request.user.two_factor_enabled:
            raise TwoFactorAlreadyEnabledException(detail="2FA is already enabled")

        config_url = request.user.enable_2fa()
        serializer = Enable2FASerializer(data={"config_url": config_url})
        serializer.is_valid(raise_exception=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


@extend_schema_view(
    post=extend_schema(
        operation_id="users_2fa_verify_create",
        summary="Verify 2FA Setup",
        description="Verifies the 2FA token and completes the setup",
        request=Verify2FASerializer,
        responses={
            200: {"description": "2FA setup completed successfully"},
            **get_error_responses(
                UserErrorCodes.INVALID_TWO_FACTOR_TOKEN,
                include_validation_error=True,
            ),
            **get_common_error_responses(),
        },
    )
)
class Verify2FASetupView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request: Request) -> Response:
        serializer = Verify2FASerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        token = serializer.validated_data["token"]

        if not request.user.verify_2fa_token(token):
            raise InvalidTwoFactorTokenException(detail="Invalid token")

        with transaction.atomic():
            confirmed_devices = TOTPDevice.objects.select_for_update().filter(user=request.user, confirmed=True)

            if confirmed_devices.count() > 1:
                newest_device = confirmed_devices.order_by("-id").first()
                confirmed_devices.exclude(id=newest_device.id).delete()

            # Update user
            request.user.two_factor_enabled = True
            request.user.save(update_fields=["two_factor_enabled"])

        return Response({"detail": "2FA enabled successfully"}, status=status.HTTP_200_OK)


@extend_schema_view(
    post=extend_schema(
        operation_id="users_2fa_disable_create",
        summary="Disable 2FA",
        description="Disables 2FA for the user",
        request=Verify2FASerializer,
        responses={
            200: {"description": "2FA disabled successfully"},
            **get_error_responses(
                UserErrorCodes.TWO_FACTOR_NOT_ENABLED,
                UserErrorCodes.INVALID_TWO_FACTOR_TOKEN,
                include_validation_error=True,
            ),
            **get_common_error_responses(),
        },
    )
)
class Disable2FAView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request: Request) -> Response:
        if not request.user.two_factor_enabled:
            raise TwoFactorNotEnabledException(detail="2FA is not enabled")

        serializer = Verify2FASerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # The verify_2fa_token and disable_2fa methods now handle transactions internally
        if request.user.verify_2fa_token(serializer.validated_data["token"]):
            request.user.disable_2fa()
            return Response({"detail": "2FA disabled successfully"}, status=status.HTTP_200_OK)

        raise InvalidTwoFactorTokenException(detail="Invalid token")
