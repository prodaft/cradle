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

from management.settings import cradle_settings


class UserCreateSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(required=True)

    class Meta:
        model = CradleUser
        fields = ["username", "email", "password", "catalyst_api_key", "vt_api_key"]
        extra_kwargs: Dict[str, Dict[str, List]] = {"username": {"validators": []}}

    def validate(self, data: Any) -> Any:
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

        if "password" in data:
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
            is_active=not cradle_settings.users.require_admin_confirmation,
            email_confirmed=not cradle_settings.users.require_email_confirmation,
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
            "vt_api_key",
            "role",
            "email_confirmed",
            "is_active",
        ]
        extra_kwargs: Dict[str, Dict[str, List]] = {"username": {"validators": []}}

    def validate(self, data: Any) -> Any:
        if "password" in data:
            try:
                password_validation.validate_password(
                    data["password"], password_validators=password_validator()
                )
            except ValidationError as e:
                raise InvalidPasswordException(e.messages)

        return super().validate(data)

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
            "is_active",
            "email_confirmed",
            "catalyst_api_key",
            "vt_api_key",
        ]

    def get_catalyst_api_key(self, obj):
        return True if obj.catalyst_api_key else False

    def get_vt_api_key(self, obj):
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
