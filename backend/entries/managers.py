from django.apps import apps
from django.db import models
from django.db.models.expressions import F
from django.db.models.query import RawQuerySet
from django.db.models.query_utils import Q

from user.models import CradleUser

from .enums import EntryType

from core.fields import BitStringField

fieldtype = BitStringField(max_length=2048, null=False, default=1, varying=False)


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
        Get entries that are not referenced by any relation
        """
        return self.filter(Q(relations_1=None) | Q(relations_2=None))

    def accessible(self, user: CradleUser) -> models.QuerySet:
        """
        Filter all entries accessible to a user
        """
        Edge = apps.get_model("entries", "Edge")
        accessible_vertices = Edge.objects.accessible(user).values_list(
            "src", flat=True
        )
        return self.filter(id__in=accessible_vertices)


class RelationQuerySet(models.QuerySet):
    def accessible(self, user: CradleUser) -> models.QuerySet:
        """
        Filter all relations accessible to a user
        """
        return self.extra(
            where=["(access_vector & %s) = %s"],
            params=[user.access_vector_inv, fieldtype.get_prep_value(0)],
        )


class EdgeQuerySet(models.QuerySet):
    def accessible(self, user: CradleUser) -> models.QuerySet:
        """
        Filter all relations accessible to a user
        """
        return self.extra(
            where=["(access_vector & %s) = %s"],
            params=[user.access_vector_inv, fieldtype.get_prep_value(0)],
        )

    def remove_mirrors(self) -> models.QuerySet:
        return self.filter(src__lt=F("dst"))


class EntryManager(models.Manager):
    def get_queryset(self):
        """
        Returns a queryset that uses the custom TeamQuerySet,
        allowing access to its methods for all querysets retrieved by this manager.
        """
        return EntryQuerySet(self.model, using=self._db).with_entry_class()

    def accessible(self, user: CradleUser) -> models.QuerySet:
        """
        Filter all entities accessible to a user
        """
        return self.get_queryset().accessible(user)

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


class EntityManager(EntryManager):
    def get_queryset(self) -> models.QuerySet:
        return super().get_queryset().is_entity()


class ArtifactManager(EntryManager):
    def get_queryset(self) -> models.QuerySet:
        return super().get_queryset().is_artifact()


class RelationManager(models.Manager):
    def get_queryset(self):
        """
        Returns a queryset that uses the custom QuerySet
        allowing access to its methods for all querysets retrieved by this manager.
        """
        return RelationQuerySet(self.model, using=self._db)

    def accessible(self, user: CradleUser) -> models.QuerySet:
        """
        Filter all relations accessible to a user
        """
        return self.get_queryset().accessible(user)

    def bulk_create(self, objs, **kwargs):
        for obj in objs:
            if obj.e1.id > obj.e2.id:
                obj.e1, obj.e2 = obj.e2, obj.e1
        return super().bulk_create(objs, **kwargs)


class EdgeManager(models.Manager):
    def get_queryset(self):
        """
        Returns a queryset that uses the custom QuerySet
        allowing access to its methods for all querysets retrieved by this manager.
        """
        return EdgeQuerySet(self.model, using=self._db)

    def accessible(self, user: CradleUser) -> models.QuerySet:
        """
        Filter all relations accessible to a user
        """
        return self.get_queryset().accessible(user)

    def remove_mirrors(self) -> models.QuerySet:
        return self.get_queryset().remove_mirrors()
