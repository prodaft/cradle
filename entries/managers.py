from django.db import models
from django.db.models import Q

from .enums import EntryType


class EntryManager(models.Manager):

    def get_filtered_entries(
        self,
        query_set: models.QuerySet,
        entry_subtypes: list[str],
        name_substr: str,
    ) -> models.QuerySet:
        """For a given initial query_set, a list of entry types, a list of entry
        subtypes and a string, filter the initial query set to keep only
        entries which have the entry type in entry_types, the artifacts which
        have the the subtype in entry_subtypes and the name containing name_substr
        as a substring. The check for containment ignores upper and lowerentity.

        Args:
            query_set: the query_set on which the additional filters are applied.
            entrySubtypes: the entry subtypes on which the QuerySet is filtered.
            name_prefix: the name_prefix on which the QuerySet is filtered.

        Returns:
            a QuerySet instance, filtered according to the entry types, entry
            subtypes and name prefix specified
        """
        return (
            # filter entries by entry type
            query_set.filter(entry_class__subtype__in=entry_subtypes)
            # filter name
            .filter(name__icontains=name_substr).order_by("name")
        )

class EntityManager(models.Manager):
    def get_queryset(self) -> models.QuerySet:
        return super().get_queryset().filter(entry_class__type=EntryType.ENTITY)


class ArtifactManager(models.Manager):
    def get_queryset(self) -> models.QuerySet:
        return super().get_queryset().filter(entry_class__type=EntryType.ARTIFACT)


