"""Serializers for teams, team members and team entity access."""

from rest_framework import serializers

from access.enums import AccessType
from user.models import CradleUser, UserRoles
from user.serializers import EssentialUserRetrieveSerializer

from .enums import TeamRole
from .models import Team, TeamAccess, TeamMembership


class TeamSerializer(serializers.ModelSerializer):
    """Team details plus the requester's relation to it."""

    member_count = serializers.SerializerMethodField(help_text="Number of members, leads included")
    my_role = serializers.SerializerMethodField(help_text="Requester's role in the team, or null if not a member")
    can_manage = serializers.SerializerMethodField(
        help_text="Whether the requester may change the team, its members and its access"
    )

    class Meta:
        model = Team
        fields = ["id", "name", "description", "created_at", "member_count", "my_role", "can_manage"]
        read_only_fields = ["id", "created_at"]
        extra_kwargs = {
            "name": {"help_text": "Unique team name", "validators": []},  # duplicates are a 409 in the view
            "description": {"help_text": "Optional description", "required": False},
        }

    def _requester(self):
        request = self.context.get("request")
        return getattr(request, "user", None)

    def get_member_count(self, obj: Team) -> int:
        if hasattr(obj, "num_members"):
            return obj.num_members
        return obj.memberships.count()

    def get_my_role(self, obj: Team) -> TeamRole | None:
        if hasattr(obj, "requester_role"):
            return obj.requester_role
        user = self._requester()
        if user is None:
            return None
        return obj.memberships.filter(user=user).values_list("role", flat=True).first()

    def get_can_manage(self, obj: Team) -> bool:
        user = self._requester()
        if user is None:
            return False
        return user.is_cradle_admin or self.get_my_role(obj) == TeamRole.LEAD


class TeamMemberSerializer(serializers.ModelSerializer):
    """A team member with their team role."""

    user = EssentialUserRetrieveSerializer(help_text="The member")
    user_role = serializers.ChoiceField(
        source="user.role", choices=UserRoles.choices, read_only=True, help_text="The member's platform role"
    )

    class Meta:
        model = TeamMembership
        fields = ["user", "user_role", "role", "joined_at"]
        extra_kwargs = {"role": {"help_text": "Role within the team"}}


class TeamCandidateSerializer(serializers.ModelSerializer):
    """A user who can be added to a team."""

    class Meta:
        model = CradleUser
        fields = ["id", "username", "role"]


class TeamMemberAddSerializer(serializers.Serializer):
    """Request body for adding a user to a team."""

    user_id = serializers.UUIDField(help_text="User to add")
    role = serializers.ChoiceField(choices=TeamRole.choices, default=TeamRole.MEMBER, help_text="Role within the team")


class TeamMemberUpdateSerializer(serializers.Serializer):
    """Request body for changing a member's role."""

    role = serializers.ChoiceField(choices=TeamRole.choices, help_text="New role within the team")


class TeamAccessEntitySerializer(serializers.Serializer):
    """Minimal entity info for team access listings."""

    id = serializers.IntegerField(help_text="Entity ID")
    name = serializers.CharField(help_text="Entity name")
    subtype = serializers.CharField(source="entry_class.subtype", help_text="Entity subtype")


class TeamAccessSerializer(serializers.ModelSerializer):
    """A team's access to one entity."""

    entity = TeamAccessEntitySerializer(help_text="The entity")
    is_owner = serializers.SerializerMethodField(help_text="Whether this team owns the entity")

    class Meta:
        model = TeamAccess
        fields = ["entity", "access_type", "is_owner"]

    def get_is_owner(self, obj: TeamAccess) -> bool:
        return obj.entity.team_id == obj.team_id


class TeamAccessUpdateSerializer(serializers.Serializer):
    """Request body for setting a team's access to an entity; ``none`` removes it."""

    access_type = serializers.ChoiceField(choices=AccessType.choices, help_text="none, read or read-write")


class TeamSummarySerializer(serializers.ModelSerializer):
    """Team id and name."""

    class Meta:
        model = Team
        fields = ["id", "name"]


class UserTeamMembershipSerializer(serializers.ModelSerializer):
    """A team a user belongs to, with their role in it."""

    team = TeamSummarySerializer(help_text="The team")

    class Meta:
        model = TeamMembership
        fields = ["team", "role", "joined_at"]
        extra_kwargs = {"role": {"help_text": "Role within the team"}}


class EntityTeamAccessSerializer(serializers.ModelSerializer):
    """One team's access to a given entity."""

    team = TeamSummarySerializer(help_text="The team")
    is_owner = serializers.SerializerMethodField(help_text="Whether this team owns the entity")

    class Meta:
        model = TeamAccess
        fields = ["team", "access_type", "is_owner"]

    def get_is_owner(self, obj: TeamAccess) -> bool:
        return obj.entity.team_id == obj.team_id


class EntityOwnerSerializer(serializers.Serializer):
    """Request body for setting an entity's owning team."""

    team_id = serializers.UUIDField(allow_null=True, help_text="Owning team, or null to clear")
