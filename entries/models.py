from django.db import models

from .managers import (
    CaseManager,
    ActorManager,
    MetadataManager,
    ArtifactManager,
    EntryManager,
)
from .enums import EntryType, EntrySubtype
import uuid


class Entry(models.Model):
    id: models.UUIDField = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False
    )
    name: models.CharField = models.CharField()
    description: models.TextField = models.TextField(null=True, blank=True)
    type: models.CharField = models.CharField(max_length=20, choices=EntryType.choices)
    subtype: models.CharField = models.CharField(
        max_length=20, choices=EntrySubtype.choices, blank=True
    )

    objects = EntryManager()
    actors = ActorManager()
    cases = CaseManager()
    artifacts = ArtifactManager()
    metadata = MetadataManager()

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["name", "type", "subtype"], name="unique_name_type_subtype"
            )
        ]

    def __eq__(self, other):
        if isinstance(other, Entry):
            return (
                self.id == other.id
                and self.name == other.name
                and self.description == other.description
                and self.type == other.type
                and self.subtype == other.subtype
            )
        return NotImplemented

    def __hash__(self):
        return hash((self.id, self.name, self.description, self.type, self.subtype))
