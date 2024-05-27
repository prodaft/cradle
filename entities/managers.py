from django.db import models
from django.db.models import Q

from .enums import EntityType


class EntityManager(models.Manager):

    def get_all_notes(self, entity_id: int) -> models.QuerySet:
        """Gets the notes of an entity ordered by timestamp in descending order

        Args:
            entity_id (int): The id of the entity

        Returns:
            models.QuerySet: The notes of the entity
                ordered by timestamp in descending order

        """
        return (
            self.get_queryset().get(id=entity_id).note_set.order_by("-timestamp").all()
        )

    def get_entities_of_type(
        self,
        entity_id: int,
        entity_type: EntityType,
    ) -> models.QuerySet:
        """Gets the entities of a entity of a specific type
            related to the entity through notes

        Args:
            entity_id (int): The id of the entity
            entity_type (EntityType): The type of the entity to filter by

        Returns:
            models.QuerySet: The entities of the case of the specific type
        """
        notes = self.get_all_notes(entity_id)

        entities = (
            self.get_queryset().filter(note__in=notes, type=entity_type).distinct()
        )

        return entities

    def get_filtered_entities(
        self,
        query_set: models.QuerySet,
        entity_types: list[str],
        entity_subtypes: list[str],
        name_prefix: str,
    ) -> models.QuerySet:
        """For a given initial query_set, a list of entity types, a list of entity
        subtypes and a name prefix, filter the initial query set to keep only
        entities which have the entity type in entity_types, the entries which
        have the the subtype in entity_subtypes and the name starting with
        name_prefix.

        Args:
            query_set: the query_set on which the additional filters are applied.
            entityTypes: the entity types on which the QuerySet is filtered.
            entitySubtypes: the entity subtypes on which the QuerySet is filtered.
            name_prefix: the name_prefix on which the QuerySet is filtered.

        Returns:
            a QuerySet instance, filtered according to the entity types, entity
            subtypes and name prefix specified
        """
        return (
            # filter entities by entity type
            query_set.filter(type__in=entity_types)
            # exclude entries of wrong type.
            .exclude(
                Q(type=EntityType.ENTRY) & ~Q(subtype__in=entity_subtypes),
            )
            # filter name
            .filter(name__startswith=name_prefix)
        )


class CaseManager(models.Manager):
    def get_queryset(self) -> models.QuerySet:
        return super().get_queryset().filter(type=EntityType.CASE)


class ActorManager(models.Manager):
    def get_queryset(self) -> models.QuerySet:
        return super().get_queryset().filter(type=EntityType.ACTOR)


class EntryManager(models.Manager):
    def get_queryset(self) -> models.QuerySet:
        return super().get_queryset().filter(type=EntityType.ENTRY)


class MetadataManager(models.Manager):
    def get_queryset(self) -> models.QuerySet:
        return super().get_queryset().filter(type=EntityType.METADATA)
