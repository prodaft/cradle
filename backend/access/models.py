"""Access model: user-entity permission mapping (read, read-write, or none)."""

import uuid

from django.db import models

from entries.models import Entry
from user.models import CradleUser

from .enums import AccessType
from .managers import AccessManager


class Access(models.Model):
    """User-entity permission record. Unique per (user, entity); entity may be null."""

    id: models.UUIDField = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="Unique identifier for this access record",
    )
    user: models.ForeignKey = models.ForeignKey(
        CradleUser,
        on_delete=models.CASCADE,
        related_name="accesses",
        help_text="User this access applies to",
    )
    entity: models.ForeignKey = models.ForeignKey(
        Entry,
        on_delete=models.CASCADE,
        null=True,
        related_name="access",
        help_text="Target entity; null when not scoped to a specific entity",
    )
    access_type: models.CharField = models.CharField(
        max_length=20,
        choices=AccessType.choices,
        default=AccessType.NONE,
        help_text="Permission level: none, read, or read-write",
    )

    objects = AccessManager()

    def __str__(self) -> str:
        """Return a human-readable representation: entity name and access type."""
        entity_str = str(self.entity) if self.entity_id else "?"
        return f"{entity_str} {self.access_type}"

    class Meta:
        constraints = [models.UniqueConstraint(fields=["user", "entity"], name="unique_user_id_entity_id")]
        verbose_name = "access"
        verbose_name_plural = "accesses"
