from django.db import models

from .managers import CaseManager, ActorManager, MetadataManager, EntryManager
from .enums import EntityType, EntitySubtype


class Entity(models.Model):
    name = models.CharField()
    description = models.TextField(null=True, blank=True)
    type = models.CharField(max_length=20, choices=EntityType.choices)
    subtype = models.CharField(max_length=20, choices=EntitySubtype.choices, blank=True)

    objects = models.Manager()
    actors = ActorManager()
    cases = CaseManager()
    entries = EntryManager()
    metadata = MetadataManager()

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["name", "type", "subtype"], name="unique_name_type_subtype"
            )
        ]

    def __eq__(self, other):
        if isinstance(other, Entity):
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
