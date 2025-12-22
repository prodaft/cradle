from django.db import models
from django.db.models import Count, Q

from access.models import Access
from entries.enums import EntryType
from user.models import CradleUser


class EnrichmentRequestQuerySet(models.QuerySet):
    def accessible_by(self, user: CradleUser) -> models.QuerySet:
        if user.is_cradle_admin:
            return self

        accessible_entity_ids = Access.objects.get_accessible_entity_ids(user.id)

        return self.annotate(
            inaccessible_count=Count(
                "entities",
                filter=~(
                    Q(entities__id__in=accessible_entity_ids)
                    | Q(entities__entry_class__type=EntryType.ARTIFACT)
                ),
            )
        ).filter(inaccessible_count=0)


class EnrichmentRequestManager(models.Manager):
    def get_queryset(self):
        return EnrichmentRequestQuerySet(self.model, using=self._db)

    def get_accessible_by(self, user: CradleUser):
        return self.get_queryset().accessible_by(user)
