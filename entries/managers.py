from django.db import connection, models
from django.db.models import Q

from user.models import CradleUser

from .enums import EntryType


class EntryQuerySet(models.QuerySet):
    def with_entry_class(self):
        return self

    def is_artifact(self) -> models.QuerySet:
        """
        Get artifacts
        """
        return self.filter(entry_class__type=EntryType.ARTIFACT)

    def is_entity(self) -> models.QuerySet:
        """
        Get entity
        """
        return self.filter(entry_class__type=EntryType.ENTITY)

    def unreferenced(self) -> models.QuerySet:
        """
        Get entries that are not referenced by any note
        """
        return self.filter(note=None)

    def _neighbour_query(self, user: CradleUser | None) -> str:
        query_parts = []
        query_args = []
        for i in self.all():
            if user is None or user.is_superuser:
                query_parts.append(
                    "SELECT entry_id AS id FROM get_related_entry_ids(%s)"
                )
                query_args.append(str(i.id))
            else:
                query_parts.append(
                    "SELECT entry_id AS id FROM get_related_entry_ids_for_user(%s, %s)"
                )
                query_args.extend((str(i.id), str(user.id)))

        query = " UNION ".join(query_parts)

        return query, query_args

    def get_neighbours(self, user: CradleUser | None) -> models.QuerySet:
        """
        Get the neighbours of an entry
        """
        query, query_args = self._neighbour_query(user)

        return self.raw(query, query_args)

    def get_neighbour_entities(self, user: CradleUser | None) -> models.QuerySet:
        """
        Get the neighbours of an entry
        """
        query, query_args = self._neighbour_query(user)

        final_query = f"""
        SELECT id, type FROM ({query}) JOIN entries_entry ee JOIN entries_entry_class eec ON ee.entry_class_id = eec.subtype WHERE type = 'entity'
        """

        return self.raw(final_query, query_args)


class EntryManager(models.Manager):
    def get_queryset(self):
        """
        Returns a queryset that uses the custom TeamQuerySet,
        allowing access to its methods for all querysets retrieved by this manager.
        """
        return EntryQuerySet(self.model, using=self._db).with_entry_class()

    def is_artifact(self) -> models.QuerySet:
        """
        Get artifacts
        """
        return self.get_queryset().is_artifact()

    def is_entity(self) -> models.QuerySet:
        """
        Get entity
        """
        return self.get_queryset().is_entity()

    def unreferenced(self) -> models.QuerySet:
        """
        Get entries that are not referenced by any note
        """
        return self.get_queryset().unreferenced()

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
            .filter(name__icontains=name_substr)
            .order_by("name")
        )

    def get_neighbours(self, user: CradleUser | None) -> models.QuerySet:
        """
        Get the neighbours of an entry
        """
        return self.get_queryset().get_neighbours(user)


class EntityManager(models.Manager):
    def get_queryset(self) -> models.QuerySet:
        return super().get_queryset().filter(entry_class__type=EntryType.ENTITY)


class ArtifactManager(models.Manager):
    def get_queryset(self) -> models.QuerySet:
        return super().get_queryset().filter(entry_class__type=EntryType.ARTIFACT)
