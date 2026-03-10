"""Core intelio Celery tasks: digest and enrichment orchestration."""

import logging
import uuid

from celery import group, shared_task

from entries.enums import EntryType
from entries.models import EntryClass

from ..enums import EnrichmentStatus
from ..models.base import BaseDigest, EnricherSettings, EnrichmentRequest

logger = logging.getLogger(__name__)


@shared_task
def run_enricher(enricher_id: uuid.UUID, request_id: uuid.UUID):
    """Run a single enricher for an enrichment request. Appends errors on failure."""
    from entries.tasks import refresh_edges_materialized_view

    request = EnrichmentRequest.objects.get(id=request_id)
    settings = EnricherSettings.objects.get(id=enricher_id)
    enricher = settings.enricher(request)

    entries = request.entries(set(settings.for_eclasses.all().values_list("subtype", flat=True)))
    try:
        enricher.pre_enrich(entries)
        enricher.enrich(entries)
    except Exception as e:
        error_message = f"Enricher {settings.enricher_type} failed: {str(e)}"
        request._append_error(error_message, settings.enricher_type)
        request._set_enricher_status(settings.enricher_type, EnrichmentStatus.ERROR)
        return

    request._set_enricher_status(settings.enricher_type, EnrichmentStatus.DONE)

    refresh_edges_materialized_view.apply_async()
    return


@shared_task
def start_digest(digest_id):
    """Start digest processing for the given digest ID. Runs digest.digest()."""
    EntryClass.objects.get_or_create(type=EntryType.ARTIFACT, subtype="digest")
    logger.debug("Starting digest %s", digest_id)
    digest = BaseDigest.objects.get(id=digest_id)
    digest.digest()


@shared_task
def start_enrich(enrich_id):
    """Start enrichment: run all enrichers for the request in parallel."""
    EntryClass.objects.get_or_create(type=EntryType.ARTIFACT, subtype="enrichment")
    request = EnrichmentRequest.objects.get(id=enrich_id)
    tasks = []
    for enricher in request.enrichers:
        tasks.append(run_enricher.si(enricher.id, request.id))

    group(*tasks).apply_async()


@shared_task
def propagate_acvec_digest(digest_id):
    """Propagate access vector from digest entities to its relations."""
    digest = BaseDigest.objects.get(id=digest_id)
    digest.update_access_vector()


@shared_task
def propagate_acvec_enrich(enrich_id):
    """Propagate access vector from enrichment entities to its relations."""
    request = EnrichmentRequest.objects.get(id=enrich_id)
    request.update_access_vector()
