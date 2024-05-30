from django.db import models
from django.db.models import Count

from entities.enums import EntityType
from entities.models import Entity
from user.models import CradleUser
from access.models import Access
from access.enums import AccessType


class NoteManager(models.Manager):

    def get_all_notes(self, entity_id: int) -> models.QuerySet:
        """Gets the notes of an entity ordered by timestamp in descending order

        Args:
            entity_id (int): The id of the entity

        Returns:
            models.QuerySet: The notes of the entity
                ordered by timestamp in descending order

        """
        return self.get_queryset().filter(entities__id=entity_id).order_by("-timestamp")

    def get_entities_from_notes(
        self,
        accessible_notes: models.QuerySet,
    ) -> models.QuerySet:
        """Gets the entities of a entity of a specific type
            related to the entity through notes

        Args:
            accessible_notes: The QuerySet containing the accessible notes
            entity_type: The type of the entity to filter by

        Returns:
            models.QuerySet: The entities of the case of the specific type
        """
        entities = Entity.objects.filter(note__in=accessible_notes).distinct()

        return entities

    def get_accessible_notes(self, user: CradleUser, entity_id: int) -> models.QuerySet:
        """Get the notes of a case that the user has access to

        Args:
            user: The user whose access is being checked
            entity_id: The id of the entiy whose notes are being retrieved

        Returns:
            QuerySet: The notes of the case that the user has access to
        """

        if user.is_superuser:
            return self.get_all_notes(entity_id)

        accessible_cases = Access.objects.filter(
            user=user, access_type__in=[AccessType.READ_WRITE, AccessType.READ]
        ).values_list("case_id", flat=True)

        inaccessible_cases = (
            Entity.objects.filter(type=EntityType.CASE)
            .exclude(id__in=accessible_cases)
            .values_list("id", flat=True)
        )

        inaccessible_notes = (
            self.get_queryset()
            .filter(entities__id__in=inaccessible_cases, entities__type=EntityType.CASE)
            .values_list("id", flat=True)
        )

        return (
            Entity.objects.get(id=entity_id)
            .note_set.exclude(id__in=inaccessible_notes)
            .order_by("-timestamp")
            .distinct()
        )

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
