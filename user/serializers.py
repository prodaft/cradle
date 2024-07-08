from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import Token
from rest_framework_simplejwt.authentication import AuthUser
from django.core.exceptions import ValidationError
from django.contrib.auth import password_validation
from django.contrib.auth.password_validation import (
    MinimumLengthValidator,
)
from .models import CradleUser
from .exceptions import DuplicateUserException, InvalidPasswordException
from typing import Dict, List, cast, Any, Sequence
from .utils.validators import (
    MinimumDigitsValidator,
    MinimumLowercaseLettersValidator,
    MinimumSpecialCharacterValidator,
    MinimumUppercaseLettersValidator,
)


class UserCreateSerializer(serializers.ModelSerializer):

    email = serializers.EmailField(required=True)

    class Meta:
        model = CradleUser
        fields = ["username", "email", "password"]
        extra_kwargs: Dict[str, Dict[str, List]] = {"username": {"validators": []}}

    def validate(self, data: Any) -> Any:
        """First checks whether there exists another user with the
        same username, in which case it returns error code 409. Then, the
        password is validated. In case the password validation fails, error
        code 400 is returned. Otherwise, it applies the other validations
        from the superclass.

        Args:
            data: a dictionary containing the attributes of
                the User entry

        Returns:
            True iff the validations pass. Otherwise, it raises DuplicateUserException
                which returns error code 409.
        """

        user_exists: bool = CradleUser.objects.filter(
            username=data["username"]
        ).exists()
        if user_exists:
            raise DuplicateUserException()

        password_validators: Sequence = (
            MinimumLowercaseLettersValidator(1),
            MinimumDigitsValidator(1),
            MinimumSpecialCharacterValidator(1),
            MinimumUppercaseLettersValidator(1),
            MinimumLengthValidator(12),
        )
        try:
            password_validation.validate_password(
                data["password"], password_validators=password_validators
            )
        except ValidationError:
            raise InvalidPasswordException()

        return super().validate(data)

    def create(self, validated_data: Any):
        """Creates a new Users entry based on the validated data.

        Args:
            validated_data: a dictionary containing the attributes of
                the User entry

        Returns:
            The created User entry
        """

        return CradleUser.objects.create_user(**validated_data)


class UserRetrieveSerializer(serializers.ModelSerializer):
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

        token["is_admin"] = cast(CradleUser, user).is_superuser

        return token
