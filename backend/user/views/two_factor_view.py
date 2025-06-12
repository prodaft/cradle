from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from ..serializers import Enable2FASerializer, Verify2FASerializer
from drf_spectacular.utils import extend_schema, extend_schema_view
from django_otp.plugins.otp_totp.models import TOTPDevice


@extend_schema_view(
    post=extend_schema(
        summary="Enable 2FA",
        description="Initiates 2FA setup for the user and returns a QR code URL",
        responses={
            200: {"description": "Returns QR code URL for 2FA setup"},
            400: {"description": "2FA is already enabled"},
        },
    )
)
class Enable2FAView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if request.user.two_factor_enabled:
            return Response(
                {"error": "2FA is already enabled"}, status=status.HTTP_400_BAD_REQUEST
            )

        # The enable_2fa method now handles the transaction and potential race conditions
        config_url = request.user.enable_2fa()
        return Response({"config_url": config_url})


@extend_schema_view(
    post=extend_schema(
        summary="Verify 2FA Setup",
        description="Verifies the 2FA token and completes the setup",
        request=Enable2FASerializer,
        responses={
            200: {"description": "2FA setup completed successfully"},
            400: {"description": "Invalid token"},
        },
    )
)
class Verify2FASetupView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        from django.db import transaction

        serializer = Enable2FASerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        token = serializer.validated_data["token"]

        if not request.user.verify_2fa_token(token):
            return Response(
                {"error": "Invalid token"}, status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():
            confirmed_devices = TOTPDevice.objects.select_for_update().filter(
                user=request.user, confirmed=True
            )

            if confirmed_devices.count() > 1:
                newest_device = confirmed_devices.order_by("-id").first()
                confirmed_devices.exclude(id=newest_device.id).delete()

            # Update user
            request.user.two_factor_enabled = True
            request.user.save(update_fields=["two_factor_enabled"])

        return Response({"message": "2FA enabled successfully"})


@extend_schema_view(
    post=extend_schema(
        summary="Disable 2FA",
        description="Disables 2FA for the user",
        request=Verify2FASerializer,
        responses={
            200: {"description": "2FA disabled successfully"},
            400: {"description": "Invalid token or 2FA not enabled"},
        },
    )
)
class Disable2FAView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not request.user.two_factor_enabled:
            return Response(
                {"error": "2FA is not enabled"}, status=status.HTTP_400_BAD_REQUEST
            )

        serializer = Verify2FASerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # The verify_2fa_token and disable_2fa methods now handle transactions internally
        if request.user.verify_2fa_token(serializer.validated_data["token"]):
            request.user.disable_2fa()
            return Response({"message": "2FA disabled successfully"})

        return Response({"error": "Invalid token"}, status=status.HTTP_400_BAD_REQUEST)
