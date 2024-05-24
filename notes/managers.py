from django.db import models
from django.db.models import Count

from entities.models import Entity
from entities.enums import EntityType

class NoteManager(models.Manager):
    def delete_unreferenced_entities(self) -> None:
        """Deletes entities of type ENTRY and METADATA that
        are not referenced by any notes.

        This function filters out entities of type ENTRY and METADATA
        that have no associated notes and deletes them from the database.
        It performs the following steps:

        1. Filter entities by type (ENTRY and METADATA).
        2. Annotate each entity with the count of related notes.
        3. Filter entities to keep only those with no associated notes.
        4. Delete the filtered unreferenced entities from the database.

        Returns:
            None: This function does not return any value.
        """
        Entity.objects.filter(
            type__in=[EntityType.ENTRY, EntityType.METADATA]
        ).annotate(note_count=Count("note")).filter(note_count=0).delete()