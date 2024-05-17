from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import Token
from .models import CradleUser, Access, AccessType
from .exceptions import DuplicateUserException


class UserCreateSerializer(serializers.ModelSerializer):

    class Meta:
        model = CradleUser
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


class AccessSerializer(serializers.ModelSerializer):
    access_type = serializers.ChoiceField(choices=AccessType, required=True)

    class Meta:
        model = Access
        fields = ["access_type"]


class AccessCaseSerializer(serializers.Serializer):
    id = serializers.CharField(max_length=200)
    name = serializers.CharField(max_length=200)
    access_type = serializers.CharField(max_length=200, default=AccessType.NONE)

    def to_representation(self, obj: dict) -> dict:
        """Takes a Case with access object dictionary and fills in
        values where the access_type is not defined.

        Args:
            obj: a dictionary which describes a Case with access privileges.
            An example is:
            {
                "id" :  2,
                "name" : "Case 1",
                "access_type" : AccessType.NONE
            }
            The "access_type" field can have None values.

        Returns:
            The same dictionary which fills in the None fields with either
            AccessType.NONE or AccessType.READ_WRITE, based on the priviliges
            of the user.

            For example, if obj = {"id" : 2, "name" : "Case 1", "access_type" : None},
            then the function will return the dictionary
            {"id" : 2, "name" : "Case 1", "access_type" : AccessType.NONE}
            if the user whose access is shown is not an admin.
        """
        data = super(AccessCaseSerializer, self).to_representation(obj)
        if self.context["is_admin"]:
            data["access_type"] = AccessType.READ_WRITE
        else:
            data["access_type"] = (
                AccessType.NONE if data["access_type"] is None else data["access_type"]
            )
        return data


class TokenObtainSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user: CradleUser) -> Token:
        """Retrieves a JWT token for a given CradleUser instance.

        Args:
            user: an instance of the CradleUser object.

        Returns:
            A JWT token to be used for validating further requests.
        """

        token = super().get_token(user)

        token["is_admin"] = user.is_superuser

        return token
