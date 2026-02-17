from typing import Any, Dict, List, cast

from django.contrib.auth import password_validation
from django.core.exceptions import ValidationError
from rest_framework import serializers
from rest_framework_simplejwt.authentication import AuthUser
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import Token

from .exceptions import (
    DisallowedActionException,
    DuplicateUserException,
    InvalidPasswordException,
)
from .models import CradleUser, UserSession
from .utils.validators import password_validator


class UserCreateSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(required=True)
    theme = serializers.JSONField(required=False)

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
        extra_kwargs: Dict[str, Dict[str, List]] = {"username": {"validators": []}}

    def validate(self, data: Any, nocheck_pw: bool = False) -> Any:
        """First checks whether there exists another user with the
        same username, in which entity it returns error code 409. Then, the
        password is validated. In entity the password validation fails, error
        code 400 is returned. Otherwise, it applies the other validations
        from the superclass.

        Args:
            data: a dictionary containing the attributes of
                the User entry

        Returns:
            True iff the validations pass. Otherwise, it raises DuplicateUserException
                which returns error code 409.
        """

        if "username" in data:
            user_exists: bool = CradleUser.objects.filter(username=data["username"]).exists()

            if user_exists:
                raise DuplicateUserException()

        if "password" in data and not nocheck_pw:
            try:
                password_validation.validate_password(data["password"], password_validators=password_validator())
            except ValidationError as e:
                raise InvalidPasswordException(e.messages)

        return super().validate(data)

    def validate_theme(self, value: Any) -> Any:
        if value is None:
            return value
        if not isinstance(value, dict):
            raise serializers.ValidationError("Theme must be a JSON object.")
        return value

    def create(self, validated_data: Any):
        """Creates a new Users entry based on the validated data.

        Args:
            validated_data: a dictionary containing the attributes of
                the User entry

        Returns:
            The created User entry
        """

        return CradleUser.objects.create_user(
            **validated_data,
        )

    def update(self, instance: CradleUser, validated_data: dict[str, Any]):
        if validated_data.get("username", instance.username) != instance.username:
            raise DisallowedActionException("You cannot change your username!")

        if validated_data.get("email", instance.email) != instance.email:
            raise DisallowedActionException("You cannot change your email")

        instance.catalyst_api_key = validated_data.get("catalyst_api_key", instance.catalyst_api_key)
        instance.vim_mode = validated_data.get("vim_mode", instance.vim_mode)
        instance.theme = validated_data.get("theme", instance.theme)
        instance.save()

        return instance


class UserCreateSerializerAdmin(UserCreateSerializer):
    email = serializers.EmailField(required=True)

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
        extra_kwargs: Dict[str, Dict[str, List]] = {"username": {"validators": []}}

    def validate(self, data: Any) -> Any:
        return super().validate(data, nocheck_pw=True)

    def update(self, instance: CradleUser, validated_data: dict[str, Any]):
        for i in validated_data:
            instance.__setattr__(i, validated_data[i])

        if "password" in validated_data:
            instance.set_password(validated_data["password"])

        instance.save()

        return instance


class UserUpdateSerializer(UserCreateSerializer):
    email = serializers.EmailField(required=False)
    username = serializers.CharField(required=False)
    password = serializers.CharField(required=False)

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

    def validate(self, data: Any) -> Any:
        return super().validate(data, nocheck_pw=True)


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True)

    def validate(self, data):
        password_validation.validate_password(data["new_password"], password_validators=password_validator())

        return data


class UserRetrieveSerializer(serializers.ModelSerializer):
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
        return True if obj.catalyst_api_key else False

    def get_oauth_connections(self, obj) -> dict:
        from django.conf import settings

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
    class Meta:
        model = CradleUser
        fields = ["id", "username"]


class OAuthConnectSerializer(serializers.Serializer):
    provider = serializers.CharField()
    code = serializers.CharField()
    redirect_uri = serializers.URLField()


class UserConfigSerializer(serializers.Serializer):
    oauth_methods = serializers.ListField(child=serializers.DictField())
    signup = serializers.BooleanField()


class TokenPairRetrieveSerializer(serializers.Serializer):
    access = serializers.CharField(required=True)
    refresh = serializers.CharField(required=True)
    role = serializers.CharField(required=True)
    access_expires_at = serializers.DateTimeField(required=True)
    refresh_expires_at = serializers.DateTimeField(required=True)


class TokenRefreshRetrieveSerializer(serializers.Serializer):
    access = serializers.CharField(required=True)
    refresh = serializers.CharField(required=True)
    role = serializers.CharField(required=True)
    access_expires_at = serializers.DateTimeField(required=True)
    refresh_expires_at = serializers.DateTimeField(required=True)


class TokenObtainSerializer(TokenObtainPairSerializer):
    two_factor_token = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text="2FA token (required if 2FA is enabled)",
    )

    @classmethod
    def get_token(cls, user: AuthUser) -> Token:
        """Retrieves a JWT token for a given CradleUser instance.

        Args:
            user: an instance of the CradleUser object.

        Returns:
            A JWT token to be used for validating further requests.
        """

        token = super().get_token(user)

        token["role"] = cast(CradleUser, user).role

        return token


class EmailConfirmSerializer(serializers.Serializer):
    token = serializers.CharField(required=True)

    def validate(self, data):
        token = data["token"]

        if not token:
            raise ValidationError("We had trouble confirming with this token.")

        try:
            self.user = CradleUser.objects.get(email_confirmation_token=token)
        except (CradleUser.DoesNotExist, CradleUser.MultipleObjectsReturned):
            raise ValidationError("We had trouble confirming with this token.")

        if self.user.email_confirmed:
            raise ValidationError("We had trouble confirming with this token.")

        return data


class Enable2FASerializer(serializers.Serializer):
    config_url = serializers.CharField(required=True)


class Verify2FASerializer(serializers.Serializer):
    token = serializers.CharField(required=True)


class Login2FASerializer(serializers.Serializer):
    token = serializers.CharField(required=True)


class APIKeyRequestSerializer(serializers.Serializer):
    """Serializer for API key generation requests"""

    pass


class PasswordResetRequestSerializer(serializers.Serializer):
    """Serializer for password reset requests (email-based only)."""

    email = serializers.EmailField(required=True, help_text="Email address to send the password reset link to")


class PasswordResetConfirmSerializer(serializers.Serializer):
    """Serializer for password reset confirmation"""

    token = serializers.CharField(required=True)
    password = serializers.CharField(required=True)

    def validate_password(self, value):
        """Validate the password using Django's password validators"""
        try:
            password_validation.validate_password(value, password_validators=password_validator())
        except ValidationError as e:
            raise serializers.ValidationError(e.messages)
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
    access_expires_at = serializers.DateTimeField(required=False)
    refresh_expires_at = serializers.DateTimeField(required=False)
    role = serializers.CharField(required=False)

    class Meta:
        ref_name = "UserManageResponse"


class ChangePasswordRequestSerializer(serializers.Serializer):
    """Serializer for change password request."""

    old_password = serializers.CharField(help_text="Current password of the user")
    new_password = serializers.CharField(help_text="New password to set")

    class Meta:
        ref_name = "ChangePasswordRequest"


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
