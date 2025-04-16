from celery import shared_task
from django.contrib.contenttypes.models import ContentType

from entries.models import Entry, EntryClass
from intelio.enums import EnrichmentStrategy
from intelio.models.base import BaseDigest, EnricherSettings
from user.models import CradleUser

from django.utils import timezone
from datetime import timedelta

BATCH_SIZE = 2048


@shared_task
def enrich_entries(enricher_id, entry_ids, content_type_id, content_id, user_id=None):
    from entries.tasks import refresh_edges_materialized_view

    settings = EnricherSettings.objects.get(id=enricher_id)

    user = None
    if user_id:
        user = CradleUser.objects.get(id=user_id)

    content_type = ContentType.objects.get(id=content_type_id)
    content_object = content_type.get_object_for_this_type(id=content_id)

    entries = Entry.objects.filter(id__in=entry_ids)

    created = settings.enricher.enrich(entries, content_object, user)

    refresh_edges_materialized_view.apply_async(simulate=created)

    return


@shared_task
def enrich_periodic():
    now = timezone.now()
    periodic_enrichers = EnricherSettings.objects.filter(
        strategy=EnrichmentStrategy.PERIODIC,
        enabled=True,
    )

    due_enrichers = []

    for enricher in periodic_enrichers:
        if enricher.last_run is None:
            due_enrichers.append(enricher)
        elif (
            enricher.periodicity is not None
            and (enricher.last_run + enricher.periodicity) <= now
        ):
            due_enrichers.append(enricher)

    for enricher in due_enrichers:
        enricher.last_run = now
        enricher.save()

        content_type = ContentType.objects.get_for_model(EntryClass)

        for eclass in enricher.for_eclasses.all():
            entries = Entry.objects.filter(entry_class=eclass).order_by("id")

            if not entries.exists():
                continue

            for i in range(0, entries.count(), BATCH_SIZE):
                entries = entries[i : i + BATCH_SIZE]
                entry_ids = list(entries.values_list("id", flat=True))

                enrich_entries.apply_async(
                    args=(enricher.id, entry_ids, content_type.id, eclass.id)
                )


@shared_task
def start_digest(digest_id):
    digest = BaseDigest.objects.get(id=digest_id)
    digest.digest()


@shared_task
def propagate_acvec(digest_id):
    digest = BaseDigest.objects.get(id=digest_id)
    digest.update_access_vector()
