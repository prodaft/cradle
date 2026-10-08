"""Serializers for access management: privileges, requests, and entity/user lists."""

from rest_framework import serializers

from user.serializers import UserRetrieveSerializer

from .enums import AccessType
from .models import Access


class AccessSerializer(serializers.ModelSerializer):
    """Serializer for updating access privileges (none, read, or read-write)."""

    class Meta:
        model = Access
        fields = ["access_type"]
        extra_kwargs = {
            "access_type": {
                "required": True,
                "help_text": "Permission level for the entity: none, read, or read-write",
            }
        }


class AccessEntitySerializer(serializers.Serializer):
    """Serializer for entity list with access type per user."""

    id = serializers.IntegerField(required=True, help_text="Entity ID")
    name = serializers.CharField(max_length=1024, help_text="Entity name")
    access_type = serializers.ChoiceField(
        choices=AccessType.choices, default=AccessType.NONE, help_text="User's access level"
    )

    def to_representation(self, obj: dict) -> dict:
        """Fill access_type when None: READ_WRITE for admins, else NONE."""
        data = super().to_representation(obj)
        if self.context["is_admin"]:
            data["access_type"] = AccessType.READ_WRITE
        else:
            data["access_type"] = AccessType.NONE if data["access_type"] is None else data["access_type"]
        return data


class AccessUserSerializer(serializers.Serializer):
    """Serializer for user list with access type per entity."""

    user = UserRetrieveSerializer(help_text="User with access")
    access_type = serializers.ChoiceField(
        choices=AccessType.choices, required=True, help_text="Access level for the entity"
    )


class RequestAccessSerializer(serializers.Serializer):
    """Serializer for access request validation."""

    entity_id = serializers.IntegerField(required=True, help_text="Entity to request access for")
    subtype = serializers.CharField(required=False, allow_null=True, help_text="Entry class ID to filter entity by")
