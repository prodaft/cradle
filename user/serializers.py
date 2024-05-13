from rest_framework import serializers
from rest_framework.exceptions import APIException
from django.contrib.auth.models import User


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(required=True)

    class Meta:
        model = User
        fields = ["username", "password"]
        extra_kwargs = {"username": {"validators": []}}

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

        user_exists = User.objects.filter(username=data["username"]).exists()
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

        return User.objects.create_user(**validated_data)


class DuplicateUserException(APIException):
    status_code = 409
    default_detail = "There exists another user with the same username."
    default_code = "unique"


class UserRetrieveSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username"]
