import uuid

from celery import group, shared_task

from entries.enums import EntryType
from entries.models import EntryClass
from intelio.enums import EnrichmentStatus
from intelio.models.base import BaseDigest, EnricherSettings, EnrichmentRequest

BATCH_SIZE = 2048


@shared_task
def run_enricher(enricher_id: uuid.UUID, request_id: uuid.UUID):
    from entries.tasks import refresh_edges_materialized_view

    request = EnrichmentRequest.objects.get(id=request_id)
    settings = EnricherSettings.objects.get(id=enricher_id)
    enricher = settings.enricher(request)

    entries = request.entries(
        set(settings.for_eclasses.all().values_list("subtype", flat=True))
    )
    try:
        enricher.pre_enrich(entries)
        enricher.enrich(entries)
    except Exception as e:
        request._append_error(f"Enricher {settings.name} failed: {str(e)}")
        request._set_enricher_status(enricher.name, EnrichmentStatus.ERROR)
        return

    request._set_enricher_status(enricher.name, EnrichmentStatus.DONE)

    refresh_edges_materialized_view.apply_async()
    return


@shared_task
def start_digest(digest_id):
    EntryClass.objects.get_or_create(type=EntryType.ARTIFACT, subtype="digest")
    print(f"Starting digest {digest_id}")
    digest = BaseDigest.objects.get(id=digest_id)
    digest.digest()


@shared_task
def start_enrich(enrich_id):
    EntryClass.objects.get_or_create(type=EntryType.ARTIFACT, subtype="enrichment")
    request = EnrichmentRequest.objects.get(id=enrich_id)
    tasks = []
    for enricher in request.enrichers:
        tasks.append(run_enricher.si(enricher.id, request.id))

    group(*tasks).apply_async()


@shared_task
def propagate_acvec_digest(digest_id):
    digest = BaseDigest.objects.get(id=digest_id)
    digest.update_access_vector()


@shared_task
def propagate_acvec_enrich(enrich_id):
    request = EnrichmentRequest.objects.get(id=enrich_id)
    request.update_access_vector()
