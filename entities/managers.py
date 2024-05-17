from django.db import models
from django.db.models import FilteredRelation, Q, F

from .enums import EntityType


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
