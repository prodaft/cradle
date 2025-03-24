from celery import shared_task


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
    pass
