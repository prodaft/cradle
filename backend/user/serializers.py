"""User serializers for CRUD, auth, OAuth, 2FA, sessions, and config."""

from typing import Any, Dict, List, cast
from urllib.parse import urlsplit

from django.conf import settings
from django.contrib.auth import password_validation
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers
from rest_framework_simplejwt.authentication import AuthUser
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import Token

from .exceptions import (
    ActionNotAllowedException,
    EmailConfirmationFailedException,
    InvalidPasswordException,
    UserAlreadyExistsException,
    UsernameUnavailableException,
)
from .models import CradleUser, UserSession
from .utils.validators import password_validator


class UserCreateSerializer(serializers.ModelSerializer):
    """Serializer for user creation (signup). Validates username, email, password."""

    email = serializers.EmailField(required=True, help_text="User email address")
    theme = serializers.JSONField(required=False, help_text="UI theme settings (JSON object)")

    class Meta:
        model = CradleUser
        fields = [
            "username",
            "email",
            "password",
            "catalyst_api_key",
            "vim_mode",
            "theme",
        ]
        extra_kwargs: Dict[str, Dict[str, List]] = {
            "username": {"validators": [], "help_text": "Unique username for login"},
            "password": {"help_text": "User password (min 12 chars, upper, lower, digit, special)"},
        }

    def validate(self, data: Any, nocheck_pw: bool = False) -> Any:
        """Check duplicate username (409), validate password (400), then superclass.

        Args:
            data: Dictionary containing the attributes of the User entry.

        Returns:
            The validated data.

        Raises:
            UsernameUnavailableException: If username already exists (409).
            UserAlreadyExistsException: If email already exists (409).
            InvalidPasswordException: If password fails validation (400).
        """
        if "username" in data:
            user_exists: bool = CradleUser.objects.filter(username=data["username"]).exists()

            if user_exists:
                raise UsernameUnavailableException(detail="That username is already taken.")

        if "email" in data:
            if CradleUser.objects.filter(email=data["email"]).exists():
                raise UserAlreadyExistsException(detail="A user with this email already exists.")

        if "password" in data and not nocheck_pw:
            try:
                password_validation.validate_password(data["password"], password_validators=password_validator())
            except DjangoValidationError as e:
                raise InvalidPasswordException(list(e.messages))

        return super().validate(data)

    def validate_theme(self, value: Any) -> Any:
        """Ensure theme is a dict of named settings or None."""
        if value is None:
            return value
        if not isinstance(value, dict):
            raise serializers.ValidationError("Use a single object of named options, not a list or plain value.")
        return value

    def create(self, validated_data: Any):
        """Creates a new Users entry based on the validated data.

        Args:
            validated_data: Dictionary containing the attributes of the User entry.

        Returns:
            The created User entry.
        """
        return CradleUser.objects.create_user(
            **validated_data,
        )

    def update(self, instance: CradleUser, validated_data: dict[str, Any]):
        """Update catalyst_api_key, vim_mode, theme only. Username and email cannot be changed."""
        if validated_data.get("username", instance.username) != instance.username:
            raise ActionNotAllowedException(detail="You cannot change your username.")

        if validated_data.get("email", instance.email) != instance.email:
            raise ActionNotAllowedException(detail="You cannot change your email.")

        instance.catalyst_api_key = validated_data.get("catalyst_api_key", instance.catalyst_api_key)
        instance.vim_mode = validated_data.get("vim_mode", instance.vim_mode)
        instance.theme = validated_data.get("theme", instance.theme)
        instance.save()

        return instance


class UserCreateSerializerAdmin(UserCreateSerializer):
    """Admin serializer for user creation/update. Skips password validation, allows role/status fields."""

    class Meta:
        model = CradleUser
        fields = [
            "username",
            "email",
            "password",
            "catalyst_api_key",
            "vim_mode",
            "theme",
            "role",
            "email_confirmed",
            "is_active",
            "two_factor_enabled",
            "file_upload_limit_override",
        ]
        extra_kwargs: Dict[str, Dict[str, List]] = {
            "username": {"validators": [], "help_text": "Unique username for login"},
            "password": {"help_text": "User password (admin can skip validation)"},
        }

    def validate(self, data: Any) -> Any:
        return super().validate(data, nocheck_pw=True)

    def update(self, instance: CradleUser, validated_data: dict[str, Any]):
        """Update user fields. Handles password separately via set_password."""
        for field, value in validated_data.items():
            if field != "password":
                setattr(instance, field, value)

        if "password" in validated_data:
            instance.set_password(validated_data["password"])

        instance.save()

        return instance


class UserUpdateSerializer(UserCreateSerializerAdmin):
    """Schema for PATCH user; all fields optional."""

    email = serializers.EmailField(required=False)
    username = serializers.CharField(required=False)
    password = serializers.CharField(required=False)


class ChangePasswordSerializer(serializers.Serializer):
    """Serializer for change password request and validation."""

    old_password = serializers.CharField(required=True, help_text="Current password of the user")
    new_password = serializers.CharField(required=True, help_text="New password to set")

    class Meta:
        ref_name = "ChangePasswordRequest"

    def validate(self, data):
        """Validate new_password against password policy."""
        try:
            password_validation.validate_password(data["new_password"], password_validators=password_validator())
        except DjangoValidationError as e:
            raise InvalidPasswordException(list(e.messages))
        return data


class UserRetrieveSerializer(serializers.ModelSerializer):
    """Serializer for user detail response. Includes role, 2FA status, theme, OAuth connections."""

    catalyst_api_key = serializers.SerializerMethodField()
    oauth_connections = serializers.SerializerMethodField()

    class Meta:
        model = CradleUser
        fields = [
            "id",
            "username",
            "email",
            "role",
            "two_factor_enabled",
            "is_active",
            "vim_mode",
            "email_confirmed",
            "catalyst_api_key",
            "file_upload_limit_override",
            "theme",
            "oauth_connections",
        ]

    def get_catalyst_api_key(self, obj) -> bool:
        """Return True if user has Catalyst API key set (masked for security)."""
        return bool(obj.catalyst_api_key)

    def get_oauth_connections(self, obj) -> dict:
        """Return dict of provider -> connected for each configured OAuth provider."""
        from .models import ExternalIdentity

        available = []
        for method in settings.OAUTH_METHODS:
            if not isinstance(method, dict):
                continue
            method_id = method.get("id") or method.get("provider") or method.get("name")
            if method_id:
                available.append(method_id)

        connected = set(ExternalIdentity.objects.filter(user=obj).values_list("provider", flat=True))

        connections: dict[str, bool] = {}
        for provider in available:
            connections[provider] = provider in connected
        for provider in connected:
            connections.setdefault(provider, True)

        return connections


class EssentialUserRetrieveSerializer(serializers.ModelSerializer):
    """Minimal user serializer (id, username) for nested references."""

    class Meta:
        model = CradleUser
        fields = ["id", "username"]


class OAuthConnectSerializer(serializers.Serializer):
    """Serializer for OAuth connect/login. Validates redirect_uri against whitelist."""

    provider = serializers.CharField(help_text="OAuth provider ID (e.g. google, github)")
    code = serializers.CharField(help_text="Authorization code from OAuth callback")
    redirect_uri = serializers.URLField(help_text="Redirect URI used in the OAuth flow")

    def validate_redirect_uri(self, value: str) -> str:
        whitelist = getattr(settings, "OAUTH_REDIRECT_URI_WHITELIST", [])
        if not whitelist:
            return value
        parsed = urlsplit(value)
        origin = f"{parsed.scheme}://{parsed.netloc}"
        if origin.rstrip("/") not in [o.rstrip("/") for o in whitelist]:
            raise serializers.ValidationError("That redirect address is not allowed.")
        return value


class UserConfigSerializer(serializers.Serializer):
    """Public config: OAuth methods and signup availability."""

    oauth_methods = serializers.ListField(
        child=serializers.DictField(),
        help_text="List of configured OAuth providers",
    )
    signup = serializers.BooleanField(help_text="Whether user registration is enabled")


class TokenPairRetrieveSerializer(serializers.Serializer):
    """Response schema for token obtain and refresh endpoints."""

    access = serializers.CharField(required=True, help_text="JWT access token")
    refresh = serializers.CharField(required=True, help_text="JWT refresh token")
    role = serializers.CharField(required=True, help_text="User role")
    access_expires_at = serializers.DateTimeField(required=True, help_text="Access token expiry")
    refresh_expires_at = serializers.DateTimeField(required=True, help_text="Refresh token expiry")


class TokenObtainSerializer(TokenObtainPairSerializer):
    """JWT obtain serializer with 2FA support and role in token claims."""

    two_factor_token = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text="2FA token (required if 2FA is enabled)",
    )

    @classmethod
    def get_token(cls, user: AuthUser) -> Token:
        """Retrieves a JWT token for a given CradleUser instance.

        Args:
            user: Instance of the CradleUser object.

        Returns:
            A JWT token to be used for validating further requests.
        """
        token = super().get_token(user)

        token["role"] = cast(CradleUser, user).role

        return token


class EmailConfirmSerializer(serializers.Serializer):
    """Serializer for email confirmation. Validates token and fetches user."""

    token = serializers.CharField(required=True, help_text="Email confirmation token from the link")

    def validate(self, data):
        token = data["token"]

        if not token:
            raise EmailConfirmationFailedException(detail="This confirmation link is invalid or has expired.")

        try:
            self.user = CradleUser.objects.get(email_confirmation_token=token)
        except CradleUser.DoesNotExist, CradleUser.MultipleObjectsReturned:
            raise EmailConfirmationFailedException(detail="This confirmation link is invalid or has expired.")

        if self.user.email_confirmed:
            raise EmailConfirmationFailedException(detail="This confirmation link is invalid or has expired.")

        return data


class Enable2FASerializer(serializers.Serializer):
    """Response serializer for 2FA enable. Contains TOTP config URL for QR code."""

    config_url = serializers.CharField(required=True, help_text="TOTP provisioning URL for authenticator apps")


class Verify2FASerializer(serializers.Serializer):
    """Serializer for 2FA token verification (enable or disable)."""

    token = serializers.CharField(required=True, help_text="6-digit TOTP code from authenticator app")


class PasswordResetRequestSerializer(serializers.Serializer):
    """Serializer for password reset requests (email-based only)."""

    email = serializers.EmailField(required=True, help_text="Email address to send the password reset link to")


class PasswordResetConfirmSerializer(serializers.Serializer):
    """Serializer for password reset confirmation."""

    token = serializers.CharField(required=True, help_text="Password reset token from the email link")
    password = serializers.CharField(required=True, help_text="New password to set")

    def validate_password(self, value):
        """Validate the password using Django's password validators."""
        try:
            password_validation.validate_password(value, password_validators=password_validator())
        except DjangoValidationError as e:
            raise InvalidPasswordException(list(e.messages))
        return value


class APIKeyResponseSerializer(serializers.Serializer):
    """Serializer for API key generation response."""

    api_key = serializers.CharField(help_text="Generated API key")

    class Meta:
        ref_name = "APIKeyResponse"


class UserManageResponseSerializer(serializers.Serializer):
    """Serializer for user management action response."""

    refresh = serializers.CharField(required=False, help_text="JWT refresh token (only for simulate action)")
    access = serializers.CharField(required=False, help_text="JWT access token (only for simulate action)")
    message = serializers.CharField(required=False, help_text="Success message for other actions")
    access_expires_at = serializers.DateTimeField(
        required=False, help_text="Access token expiry (simulate action only)"
    )
    refresh_expires_at = serializers.DateTimeField(
        required=False, help_text="Refresh token expiry (simulate action only)"
    )
    role = serializers.CharField(required=False, help_text="User role (simulate action only)")

    class Meta:
        ref_name = "UserManageResponse"


class ChangePasswordResponseSerializer(serializers.Serializer):
    """Serializer for change password response."""

    detail = serializers.CharField(help_text="Success message", default="Password changed successfully.")

    class Meta:
        ref_name = "ChangePasswordResponse"


class DefaultNoteTemplateSerializer(serializers.Serializer):
    """Serializer for default note template."""

    template = serializers.CharField(
        required=True,
        allow_blank=True,
        help_text="Default template text for new notes",
    )

    class Meta:
        ref_name = "DefaultNoteTemplate"


class DefaultNoteTemplateResponseSerializer(serializers.Serializer):
    """Serializer for default note template response."""

    template = serializers.CharField(help_text="Current default template for new notes", allow_null=True)

    class Meta:
        ref_name = "DefaultNoteTemplateResponse"


class UserSessionSerializer(serializers.ModelSerializer):
    """Serializer for user session information."""

    refresh_token_jti = serializers.CharField(read_only=True)

    class Meta:
        model = UserSession
        fields = [
            "id",
            "refresh_token_jti",
            "device_info",
            "ip_address",
            "created_at",
            "last_activity",
            "expires_at",
            "is_current",
        ]
        read_only_fields = fields
