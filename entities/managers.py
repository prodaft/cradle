from django.db import models
from django.db.models import FilteredRelation, Q, F

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

    def get_accesses(self, user_id: int) -> models.QuerySet:
        """Retrieves from the database the access_type of all cases for a given user id.

        Args:
            user_id: Id of the user whose access is to be updated.

        Returns:
            A QuerySet containing instances which are dictionaries.
            The dictionaries are as follows:
            {
                "id" : 2,
                "name" : "Case 2",
                "access_type" : AccessType.NONE
            }
        """
        return (
            self.get_queryset()
            .annotate(
                access_type=FilteredRelation(
                    "access", condition=Q(access__user=user_id)
                )
            )  # left outer join
            .values("id", "name", "access_type__access_type")  # separate table
            .annotate(access_type=F("access_type__access_type"))  # rename obscure field
        )


class ActorManager(models.Manager):
    def get_queryset(self) -> models.QuerySet:
        return super().get_queryset().filter(type=EntityType.ACTOR)


class EntryManager(models.Manager):
    def get_queryset(self) -> models.QuerySet:
        return super().get_queryset().filter(type=EntityType.ENTRY)


class MetadataManager(models.Manager):
    def get_queryset(self) -> models.QuerySet:
        return super().get_queryset().filter(type=EntityType.METADATA)
