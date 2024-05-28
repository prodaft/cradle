from django.db import models
from django.db.models import Q

from .enums import EntityType


class EntityManager(models.Manager):

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
