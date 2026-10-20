"""Serializers for access management: privileges, requests, and entity/user lists."""

from rest_framework import serializers

from user.serializers import UserRetrieveSerializer

from .enums import AccessType, highest_access
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
        choices=AccessType.choices, default=AccessType.NONE, help_text="User's direct access level"
    )
    team_access_type = serializers.ChoiceField(
        choices=AccessType.choices,
        default=AccessType.NONE,
        help_text="Strongest access the user gets through their teams",
    )
    effective_access_type = serializers.SerializerMethodField(
        help_text="Strongest access from any source (direct, teams, public)"
    )

    def get_effective_access_type(self, obj: dict) -> AccessType:
        public = AccessType.READ if obj.get("is_public") else None
        return highest_access(obj.get("access_type"), obj.get("team_access_type"), public)

    def to_representation(self, obj: dict) -> dict:
        """Fill missing access types with NONE; admins have READ_WRITE directly and effectively."""
        data = super().to_representation(obj)
        for key in ("access_type", "team_access_type", "effective_access_type"):
            if data[key] is None:
                data[key] = AccessType.NONE
        if self.context["is_admin"]:
            data["access_type"] = data["effective_access_type"] = AccessType.READ_WRITE
        return data


class AccessTeamGrantSerializer(serializers.Serializer):
    """A team through which a user gets access to an entity."""

    id = serializers.UUIDField(help_text="Team ID")
    name = serializers.CharField(help_text="Team name")
    access_type = serializers.ChoiceField(choices=AccessType.choices, help_text="Access the team has to the entity")


class AccessUserSerializer(serializers.Serializer):
    """Serializer for user list with access type per entity."""

    user = UserRetrieveSerializer(help_text="User with access")
    access_type = serializers.ChoiceField(
        choices=AccessType.choices, required=True, help_text="User's direct access level for the entity"
    )
    team_access_type = serializers.ChoiceField(
        choices=AccessType.choices, help_text="Strongest access the user gets through their teams"
    )
    effective_access_type = serializers.ChoiceField(
        choices=AccessType.choices, help_text="Strongest access from any source (direct, teams, public)"
    )
    teams = AccessTeamGrantSerializer(many=True, help_text="Teams giving the user access to the entity")


class RequestAccessSerializer(serializers.Serializer):
    """Serializer for access request validation."""

    entity_id = serializers.IntegerField(required=True, help_text="Entity to request access for")
    subtype = serializers.CharField(required=False, allow_null=True, help_text="Entry class ID to filter entity by")
