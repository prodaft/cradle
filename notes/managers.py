from django.db import models
from django.db.models import Count

from entities.enums import EntityType
from entities.models import Entity
from user.models import CradleUser
from access.models import Access
from access.enums import AccessType
from django.db.models import Case, When, Q, F

from typing import List
from uuid import UUID
from typing import Optional, Generator


class NoteManager(models.Manager):

    def get_all_notes(self, entity_id: UUID | str) -> models.QuerySet:
        """Gets the notes of an entity ordered by timestamp in descending order

        Args:
            entity_id (UUID): The id of the entity

        Returns:
            models.QuerySet: The notes of the entity
                ordered by timestamp in descending order

        """
        return self.get_queryset().filter(entities__id=entity_id).order_by("-timestamp")

    def get_entities_from_notes(
        self,
        notes: models.QuerySet,
    ) -> models.QuerySet:
        """Gets the entities from a QuerySet of notes

        Args:
            notes: The QuerySet containing the notes
            entity_type: The type of the entity to filter by

        Returns:
            models.QuerySet: The entities referenced by the notes
        """
        entities = Entity.objects.filter(note__in=notes).distinct()

        return entities

    def get_accessible_notes(
        self, user: CradleUser, entity_id: Optional[UUID] = None
    ) -> models.QuerySet:
        """Get the notes of a case that the user has access to.
        If None is provided as a parameter, then the method returns all
        accessible notes.

        Args:
            user: The user whose access is being checked
            entity_id: The id of the entiy whose notes are being retrieved

        Returns:
            QuerySet: The notes of the case that the user has access to or
            all the notes the user has access to if None is provided for
            entity_id.
        """

        if user.is_superuser:
            return (
                (
                    self.get_all_notes(entity_id)
                    if entity_id is not None
                    else self.get_queryset().all()
                )
                .order_by("-timestamp")
                .distinct()
            )

        inaccessible_notes = self.get_inaccessible_notes(user).values_list(
            "id", flat=True
        )

        if entity_id is None:
            notes = self.get_queryset().all()
        else:
            notes = self.get_queryset().filter(entities__id=entity_id)

        return (
            notes.exclude(id__in=inaccessible_notes).order_by("-timestamp").distinct()
        )

    def get_inaccessible_notes(
        self, user: CradleUser, entity_id: Optional[UUID] = None
    ):
        """Get the notes a user does not have any access to.

        Args:
            user: The user whose access is being checked
            entity_id: The id of the entiy whose notes are being retrieved

        Returns:
            QuerySet: The notes that the user does not have access to
        """
        if user.is_superuser:
            return self.get_queryset().none()

        accessible_cases = Access.objects.filter(
            user=user, access_type__in=[AccessType.READ_WRITE, AccessType.READ]
        ).values_list("case_id", flat=True)

        inaccessible_cases = (
            Entity.objects.filter(type=EntityType.CASE)
            .exclude(id__in=accessible_cases)
            .values_list("id", flat=True)
        )

        inaccessible_notes = self.get_queryset().filter(
            entities__id__in=inaccessible_cases, entities__type=EntityType.CASE
        )

        if entity_id is None:
            return inaccessible_notes

        return inaccessible_notes.filter(entities__id=entity_id)

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

    def get_in_order(self, note_ids: List) -> models.QuerySet:
        """Gets the notes in the order specified by the given list of note IDs.

        Args:
            note_ids (List[int]): A list of note IDs specifying the order in
                which the notes should be fetched.

        Returns:
            models.QuerySet: A QuerySet of Note objects ordered according to
                the specified list of note IDs.
        """
        ordering = Case(*[When(id=id, then=pos) for pos, id in enumerate(note_ids)])
        return self.get_queryset().filter(id__in=note_ids).order_by(ordering)

    def get_links(self, note_list: models.QuerySet) -> models.QuerySet:
        """Given a list of note ids, retrieve pairs of entities connected
        by those notes.

        Args:
            note_list (models.QuerySet): The list of note ids.

        Returns:
            models.QuerySet: The pairs of entities linked using notes.

        """
        connected_entities = Entity.objects.annotate(
            note_count=Count("note", filter=Q(note__id__in=note_list))
        )

        connected_entities = connected_entities.filter(note_count__gt=0)

        entity_pairs = (
            connected_entities.values(
                first_node=F("id"),
                second_node=F("note__entities__id"),
            )
            .distinct()
            .filter(first_node__lt=F("second_node"))
        )

        return entity_pairs

    def note_references_iterator(
        self, note_list: models.QuerySet, entity_type: EntityType
    ) -> Generator:
        """Given a QuerySet of Notes, returns an iterator over all
        entities references in those Notes, that have the specified
        Entity Type.

        Args:
            note_list (models.QuerySet): The QuerySet of Notes
            entity_type (entities.EntityType): The EntityType entities
                need to match

        Returns:
            Generator: The iterator over the entities

        """

        returned_entities = set()

        for note in note_list:
            for entity in note.entities.filter(type=entity_type):
                if entity not in returned_entities:
                    returned_entities.add(entity)
                    yield entity

    def get_accessible_entry_ids(self, user: CradleUser) -> models.QuerySet:
        """For a given user id, get a list of all entry ids which
        are accessible by the user. An entry is considered to be accessible by the
        user when it is referenced in at least one note that the user has access to.
        This method does not take into consideration the access privileges of the user.
        Hence, this method should not be used for admin users.

        Args:
            user_id: the id of the user.

        Returns:
            A QuerySet instance which gives all the entry ids to which the user
            has access.
        """

        return (
            self.get_entities_from_notes(self.get_accessible_notes(user))
            .filter(type=EntityType.ENTRY)
            .values("id")
            .distinct()
        )
