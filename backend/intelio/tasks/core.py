"""Core intelio Celery tasks: digest and enrichment orchestration."""

import logging
import uuid

from celery import group, shared_task

from entries.constants import INTERNAL_ENTRY_CLASS_DEFAULTS, SUBTYPE_DIGEST, SUBTYPE_ENRICHMENT
from entries.models import EntryClass

from ..enums import EnrichmentStatus
from ..models.base import BaseDigest, BaseEnricher, EnricherSettings, EnrichmentRequest

logger = logging.getLogger(__name__)


@shared_task
def run_enricher(enricher_id: uuid.UUID, request_id: uuid.UUID):
    """Run a single enricher for an enrichment request inside an isolated container.

    Each enricher executes in a short-lived Docker container with no database
    connection, no filesystem mounts, and no access to internal Cradle services.
    Errors are recorded on the ``EnrichmentRequest`` rather than propagated.
    """
    from entries.tasks import refresh_edges_materialized_view

    from ..runner.docker_runner import run_enricher_container

    request = EnrichmentRequest.objects.get(id=request_id)
    enricher_settings = EnricherSettings.objects.get(id=enricher_id)

    entries = request.entries(set(enricher_settings.for_eclasses.all().values_list("subtype", flat=True)))

    try:
        run_enricher_container(
            enricher_type=enricher_settings.enricher_type,
            enricher_settings=enricher_settings.settings,
            entries=entries,
            request=request,
        )
    except Exception:
        label = BaseEnricher.display_label_for_type(enricher_settings.enricher_type)
        logger.exception("Enrichment run failed (%s)", enricher_settings.enricher_type)
        error_message = f"{label} could not finish. Please try again."
        request._append_error(error_message, enricher_settings.enricher_type)
        request._set_enricher_status(enricher_settings.enricher_type, EnrichmentStatus.ERROR)
        return

    request._set_enricher_status(enricher_settings.enricher_type, EnrichmentStatus.DONE)

    refresh_edges_materialized_view.apply_async()
    return


@shared_task
def start_digest(digest_id):
    """Start digest processing for the given digest ID. Runs digest.digest()."""
    EntryClass.objects.get_or_create(subtype=SUBTYPE_DIGEST, defaults=INTERNAL_ENTRY_CLASS_DEFAULTS[SUBTYPE_DIGEST])
    logger.debug("Starting digest %s", digest_id)
    digest = BaseDigest.objects.get(id=digest_id)
    digest.digest()


@shared_task
def start_enrich(enrich_id):
    """Start enrichment: run all enrichers for the request in parallel."""
    EntryClass.objects.get_or_create(
        subtype=SUBTYPE_ENRICHMENT, defaults=INTERNAL_ENTRY_CLASS_DEFAULTS[SUBTYPE_ENRICHMENT]
    )
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
