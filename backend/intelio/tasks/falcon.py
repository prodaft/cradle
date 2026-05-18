"""Falcon digest Celery tasks."""

import logging

from celery import shared_task

from ..enums import DigestStatus
from ..models.base import BaseDigest

logger = logging.getLogger(__name__)


@shared_task
def digest_chunk(digest_id, start, end, last):
    """Process a chunk of Falcon digest data. If last=True, marks digest done and refreshes edges."""
    digest = BaseDigest.objects.get(id=digest_id)

    if digest.status == DigestStatus.ERROR:
        return

    digest.digest_chunk(start, end)

    if len(digest.errors) > 0:
        digest.status = DigestStatus.ERROR
        logger.warning("Digest %s errors: %s", digest_id, digest.errors)
        digest.save()
        return
    elif last:
        digest.status = DigestStatus.DONE
        digest.save()
        from entries.tasks import refresh_edges_materialized_view

        refresh_edges_materialized_view.apply_async()
