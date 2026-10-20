"""Core intelio Celery tasks: digest and enrichment orchestration."""

import logging
import uuid

from celery import group, shared_task
from django.utils import timezone

from entries.constants import INTERNAL_ENTRY_CLASS_DEFAULTS, SUBTYPE_DIGEST, SUBTYPE_ENRICHMENT
from entries.models import EntryClass

from ..enums import EnrichmentStatus
from ..models.base import BaseDigest, BaseEnricher, EnricherSettings, EnrichmentRequest

logger = logging.getLogger(__name__)


def _exception_chain(exc: BaseException) -> list[BaseException]:
    out: list[BaseException] = []
    seen: set[int] = set()
    cur: BaseException | None = exc
    while cur is not None and id(cur) not in seen:
        seen.add(id(cur))
        out.append(cur)
        cur = cur.__cause__ or cur.__context__
    return out


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

    label = BaseEnricher.display_label_for_type(enricher_settings.enricher_type)
    try:
        entries = request.entries(set(enricher_settings.for_eclasses.all().values_list("subtype", flat=True)))
    except EntryClass.DoesNotExist:
        request.fail_enricher(
            enricher_settings.enricher_type, f"{label}: the artifact's entry type is no longer available."
        )
        return

    try:
        run_enricher_container(
            enricher_type=enricher_settings.enricher_type,
            enricher_settings=enricher_settings.settings,
            entries=entries,
            request=request,
        )
    except Exception as exc:
        logger.exception("Enrichment run failed (%s)", enricher_settings.enricher_type)
        error_message = f"{label} could not finish. Please try again."
        if any(x.__class__.__name__ == "ImageNotFound" for x in _exception_chain(exc)):
            error_message = f"{label}: Docker image is missing."
        request.fail_enricher(enricher_settings.enricher_type, error_message)
        return

    request.set_enricher_status(enricher_settings.enricher_type, EnrichmentStatus.DONE)

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
    tasks = [
        run_enricher.si(settings_id, request.id)
        for settings_id in request.enrichers_settings.values_list("id", flat=True)
    ]
    if not tasks:
        request.status = EnrichmentStatus.ERROR
        request.completed_at = timezone.now()
        request.save(update_fields=["status", "completed_at"])
        return

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
