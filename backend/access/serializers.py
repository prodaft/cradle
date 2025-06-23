from rest_framework import serializers
from .models import Access
from .enums import AccessType


class AccessSerializer(serializers.ModelSerializer):
    access_type = serializers.ChoiceField(choices=AccessType, required=True)

    class Meta:
        model = Access
        fields = ["access_type"]


class AccessEntitySerializer(serializers.Serializer):
    id = serializers.CharField(max_length=200)
    name = serializers.CharField(max_length=200)
    access_type = serializers.CharField(max_length=200, default=AccessType.NONE)

    def to_representation(self, obj: dict) -> dict:
        """Takes an Entity with access object dictionary and fills in
        values where the access_type is not defined.

        Args:
            obj: a dictionary which describes an Entity with access privileges.
            An example is:
            {
                "id" :  2,
                "name" : "Entity 1",
                "access_type" : AccessType.NONE
            }
            The "access_type" field can have None values.

        Returns:
            The same dictionary which fills in the None fields with either
            AccessType.NONE or AccessType.READ_WRITE, based on the priviliges
            of the user.

            For example, if obj = {"id" : 2, "name" : "Entity 1", "access_type" : None},
            then the function will return the dictionary
            {"id" : 2, "name" : "Entity 1", "access_type" : AccessType.NONE}
            if the user whose access is shown is not an admin.
        """
        data = super(AccessEntitySerializer, self).to_representation(obj)
        if self.context["is_admin"]:
            data["access_type"] = AccessType.READ_WRITE
        else:
            data["access_type"] = (
                AccessType.NONE if data["access_type"] is None else data["access_type"]
            )
        return data


class RequestAccessSerializer(serializers.Serializer):
    """Serializer for the RequestAccess view."""

    entity_id = serializers.UUIDField(required=True)
    subtype = serializers.CharField(required=False, allow_null=True)
