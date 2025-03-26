from celery import shared_task

from intelio.models.base import BaseDigest


@shared_task
def enrich_entry(entry_id, enricher_id):
    pass


@shared_task
def enrich_all(enricher_id):
    pass


@shared_task
def enrich_periodic():
    pass


@shared_task
def start_digest(digest_id):
    digest = BaseDigest.objects.get(id=digest_id)
    digest.digest()
