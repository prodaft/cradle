"""Team models: teams, their members and the entities they can access."""

import uuid

from django.db import models
from django.db.models import Q

from access.enums import AccessType
from entries.models import Entry
from logs.models import LoggableModelMixin
from user.models import CradleUser

from .enums import TeamRole
from .managers import TeamQuerySet

TEAM_ACCESS_CHOICES = [
    (AccessType.READ.value, AccessType.READ.label),
    (AccessType.READ_WRITE.value, AccessType.READ_WRITE.label),
]


class Team(LoggableModelMixin, models.Model):
    """A group of users, led by one or more of its members, that shares access to entities."""

    id: models.UUIDField = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name: models.CharField = models.CharField(max_length=255, unique=True, help_text="Unique team name")
    description: models.TextField = models.TextField(blank=True, default="", help_text="Optional description")
    created_by: models.ForeignKey = models.ForeignKey(
        CradleUser,
        on_delete=models.SET_NULL,
        null=True,
        related_name="+",
        help_text="User who created the team",
    )
    created_at: models.DateTimeField = models.DateTimeField(auto_now_add=True, help_text="Creation timestamp")

    objects = TeamQuerySet.as_manager()

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name

    def _linked_loggables(self):
        """Team logs stay on the team; members and owned entities are not touched."""
        return iter(())

    def propagate_from(self, log) -> None:
        """Ignore logs propagated from owned entities."""

    def leads(self):
        """The users who lead this team."""
        return CradleUser.objects.filter(team_memberships__team=self, team_memberships__role=TeamRole.LEAD)

    def is_lead(self, user: CradleUser) -> bool:
        """True if ``user`` leads this team."""
        return self.leads().filter(pk=user.pk).exists()

    def can_manage(self, user: CradleUser) -> bool:
        """Whether ``user`` may change this team's details, members and access (admins and leads)."""
        return user.is_cradle_admin or self.is_lead(user)

    def take_ownership(self, entity: Entry) -> None:
        """Make this team own ``entity`` and give it read-write access."""
        entity.team = self
        entity.save(update_fields=["team"])
        TeamAccess.objects.update_or_create(team=self, entity=entity, defaults={"access_type": AccessType.READ_WRITE})


class TeamMembership(models.Model):
    """A user's membership in a team, as lead or member."""

    id: models.UUIDField = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    team: models.ForeignKey = models.ForeignKey(
        Team, on_delete=models.CASCADE, related_name="memberships", help_text="Team"
    )
    user: models.ForeignKey = models.ForeignKey(
        CradleUser, on_delete=models.CASCADE, related_name="team_memberships", help_text="Member"
    )
    role: models.CharField = models.CharField(
        max_length=16, choices=TeamRole.choices, default=TeamRole.MEMBER, help_text="Role within the team"
    )
    joined_at: models.DateTimeField = models.DateTimeField(auto_now_add=True, help_text="When the user joined")

    class Meta:
        constraints = [models.UniqueConstraint(fields=["team", "user"], name="unique_team_membership")]
        ordering = ["team", "user__username"]

    def __str__(self) -> str:
        return f"{self.user} in {self.team} ({self.role})"


class TeamAccess(models.Model):
    """Access a team's members get to an entity. No row means no access."""

    id: models.UUIDField = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    team: models.ForeignKey = models.ForeignKey(
        Team, on_delete=models.CASCADE, related_name="accesses", help_text="Team the access applies to"
    )
    entity: models.ForeignKey = models.ForeignKey(
        Entry, on_delete=models.CASCADE, related_name="team_accesses", help_text="Target entity"
    )
    access_type: models.CharField = models.CharField(
        max_length=20, choices=TEAM_ACCESS_CHOICES, help_text="Permission level: read or read-write"
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["team", "entity"], name="unique_team_entity_access"),
            models.CheckConstraint(
                condition=Q(access_type__in=[AccessType.READ, AccessType.READ_WRITE]),
                name="team_access_type_not_none",
            ),
        ]
        verbose_name = "team access"
        verbose_name_plural = "team accesses"

    def __str__(self) -> str:
        return f"{self.team} {self.entity} {self.access_type}"
