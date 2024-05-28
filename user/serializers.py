from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import Token
from rest_framework_simplejwt.authentication import AuthUser
from .models import CradleUser
from .exceptions import DuplicateUserException
from typing import Dict, List, cast


class UserCreateSerializer(serializers.ModelSerializer):

    class Meta:
        model = CradleUser
        fields = ["username", "password"]
        extra_kwargs: Dict[str, Dict[str, List]] = {"username": {"validators": []}}

    def validate(self, data):
        """First checks whether there exists another user with the
        same username, in which case it returns error code 409. Otherwise,
        it applies the other validations from the superclass.

        Args:
            data: a dictionary containing the attributes of
                the User entity

        Returns:
            True iff the validations pass. Otherwise, it raises DuplicateUserException
                which returns error code 409.
        """

        user_exists = CradleUser.objects.filter(username=data["username"]).exists()
        if user_exists:
            raise DuplicateUserException()
        return super().validate(data)

    def create(self, validated_data):
        """Creates a new Users entity based on the validated data.

        Args:
            validated_data: a dictionary containing the attributes of
                the User entity

        Returns:
            The created User entity
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
