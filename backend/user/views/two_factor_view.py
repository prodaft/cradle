"""2FA enable, verify, and disable views using django-otp TOTP."""

from django.db import transaction
from django_otp.plugins.otp_totp.models import TOTPDevice
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from core.openapi import get_common_error_responses, get_error_responses

from ..authentication import CookieJWTAuthentication
from ..exceptions import (
    InvalidTwoFactorCodeException,
    TwoFactorAlreadyEnabledException,
    TwoFactorNotEnabledException,
    UserErrorCodes,
)
from ..serializers import Disable2FASerializer, Enable2FASerializer, StepUpSerializer, Verify2FASerializer
from ..utils.step_up import require_step_up, validate_step_up


@extend_schema_view(
    post=extend_schema(
        operation_id="users_2fa_enable_create",
        summary="Enable 2FA",
        description="Initiates 2FA setup for the user and returns a QR code URL",
        request=StepUpSerializer,
        responses={
            200: Enable2FASerializer,
            **get_error_responses(
                UserErrorCodes.TWO_FACTOR_ALREADY_ENABLED,
                UserErrorCodes.CURRENT_PASSWORD_INCORRECT,
                include_validation_error=True,
            ),
            **get_common_error_responses(),
        },
    )
)
class Enable2FAView(APIView):
    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request: Request) -> Response:
        if request.user.two_factor_enabled:
            raise TwoFactorAlreadyEnabledException(detail="Two-factor authentication is already enabled.")

        validate_step_up(request, request.user, request.data)

        config_url = request.user.enable_2fa()
        serializer = Enable2FASerializer(data={"config_url": config_url})
        serializer.is_valid(raise_exception=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


@extend_schema_view(
    post=extend_schema(
        operation_id="users_2fa_verify_create",
        summary="Verify 2FA Setup",
        description="Verifies the 2FA OTP and completes the setup",
        request=Verify2FASerializer,
        responses={
            200: {"description": "Two-factor authentication setup completed successfully"},
            **get_error_responses(
                UserErrorCodes.INVALID_TWO_FACTOR_CODE,
                include_validation_error=True,
            ),
            **get_common_error_responses(),
        },
    )
)
class Verify2FASetupView(APIView):
    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request: Request) -> Response:
        serializer = Verify2FASerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        otp = serializer.validated_data["otp"]

        if not request.user.verify_otp(otp):
            raise InvalidTwoFactorCodeException(detail="The two-factor authentication code is invalid.")

        with transaction.atomic():
            confirmed_devices = TOTPDevice.objects.select_for_update().filter(user=request.user, confirmed=True)

            if confirmed_devices.count() > 1:
                newest_device = confirmed_devices.order_by("-id").first()
                confirmed_devices.exclude(id=newest_device.id).delete()

            request.user.two_factor_enabled = True
            request.user.save(update_fields=["two_factor_enabled"])

        return Response(
            {"detail": "Two-factor authentication has been enabled."},
            status=status.HTTP_200_OK,
        )


@extend_schema_view(
    post=extend_schema(
        operation_id="users_2fa_disable_create",
        summary="Disable 2FA",
        description="Disables 2FA for the user",
        request=Disable2FASerializer,
        responses={
            200: {"description": "Two-factor authentication disabled successfully"},
            **get_error_responses(
                UserErrorCodes.TWO_FACTOR_NOT_ENABLED,
                UserErrorCodes.INVALID_TWO_FACTOR_CODE,
                UserErrorCodes.CURRENT_PASSWORD_INCORRECT,
                include_validation_error=True,
            ),
            **get_common_error_responses(),
        },
    )
)
class Disable2FAView(APIView):
    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request: Request) -> Response:
        if not request.user.two_factor_enabled:
            raise TwoFactorNotEnabledException(detail="Two-factor authentication is not enabled.")

        serializer = Disable2FASerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        require_step_up(
            request,
            request.user,
            serializer.validated_data.get("password") or None,
        )
        if request.user.verify_otp(serializer.validated_data["otp"]):
            request.user.disable_2fa()
            return Response(
                {"detail": "Two-factor authentication has been disabled."},
                status=status.HTTP_200_OK,
            )

        raise InvalidTwoFactorCodeException(detail="The two-factor authentication code is invalid.")
