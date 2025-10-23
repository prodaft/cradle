from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import Token
from rest_framework_simplejwt.authentication import AuthUser
from django.core.exceptions import ValidationError
from django.contrib.auth import password_validation
from .models import CradleUser
from .exceptions import (
    DisallowedActionException,
    DuplicateUserException,
    InvalidPasswordException,
)
from typing import Dict, List, cast, Any
from .utils.validators import password_validator


class UserCreateSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(required=True)

    class Meta:
        model = CradleUser
        fields = [
            "username",
            "email",
            "password",
            "catalyst_api_key",
            "vt_api_key",
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
            user_exists: bool = CradleUser.objects.filter(
                username=data["username"]
            ).exists()

            if user_exists:
                raise DuplicateUserException()

        if "password" in data and not nocheck_pw:
            try:
                password_validation.validate_password(
                    data["password"], password_validators=password_validator()
                )
            except ValidationError as e:
                raise InvalidPasswordException(e.messages)

        return super().validate(data)

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

        instance.vt_api_key = validated_data.get("vt_api_key", instance.vt_api_key)
        instance.catalyst_api_key = validated_data.get(
            "catalyst_api_key", instance.catalyst_api_key
        )
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
            "vt_api_key",
            "role",
            "email_confirmed",
            "is_active",
            "two_factor_enabled",
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


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True)

    def validate(self, data):
        password_validation.validate_password(
            data["new_password"], password_validators=password_validator()
        )

        return data


class UserRetrieveSerializer(serializers.ModelSerializer):
    catalyst_api_key = serializers.SerializerMethodField()
    vt_api_key = serializers.SerializerMethodField()

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
            "vt_api_key",
            "theme",
        ]

    def get_catalyst_api_key(self, obj) -> bool:
        return True if obj.catalyst_api_key else False

    def get_vt_api_key(self, obj) -> bool:
        return True if obj.vt_api_key else False


class EssentialUserRetrieveSerializer(serializers.ModelSerializer):
    class Meta:
        model = CradleUser
        fields = ["id", "username"]


class TokenObtainSerializer(TokenObtainPairSerializer):
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

        try:
            self.user = CradleUser.objects.get(email_confirmation_token=token)
        except CradleUser.DoesNotExist:
            raise ValidationError("We had trouble confirming with this token.")

        if self.user.email_confirmed:
            raise ValidationError("We had trouble confirming with this token.")

        if not token or self.user.email_confirmation_token != token:
            raise ValidationError("We had trouble confirming with this token.")

        return True


class Enable2FASerializer(serializers.Serializer):
    token = serializers.CharField(required=True)


class Verify2FASerializer(serializers.Serializer):
    token = serializers.CharField(required=True)


class Login2FASerializer(serializers.Serializer):
    token = serializers.CharField(required=True)


class APIKeyRequestSerializer(serializers.Serializer):
    """Serializer for API key generation requests"""

    pass


class PasswordResetRequestSerializer(serializers.Serializer):
    """Serializer for password reset requests"""

    email = serializers.EmailField(required=False)
    username = serializers.CharField(required=False)

    def validate(self, data):
        if not data.get("email") and not data.get("username"):
            raise serializers.ValidationError("Email or username must be provided")
        return data


class PasswordResetConfirmSerializer(serializers.Serializer):
    """Serializer for password reset confirmation"""

    token = serializers.CharField(required=True)
    password = serializers.CharField(required=True)


class APIKeyResponseSerializer(serializers.Serializer):
    """Serializer for API key generation response."""

    api_key = serializers.CharField(help_text="Generated API key")

    class Meta:
        ref_name = "APIKeyResponse"


class UserManageResponseSerializer(serializers.Serializer):
    """Serializer for user management action response."""

    refresh = serializers.CharField(
        required=False, help_text="JWT refresh token (only for simulate action)"
    )
    access = serializers.CharField(
        required=False, help_text="JWT access token (only for simulate action)"
    )
    message = serializers.CharField(
        required=False, help_text="Success message for other actions"
    )

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

    detail = serializers.CharField(
        help_text="Success message", default="Password changed successfully."
    )

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

    template = serializers.CharField(
        help_text="Current default template for new notes", allow_null=True
    )

    class Meta:
        ref_name = "DefaultNoteTemplateResponse"
