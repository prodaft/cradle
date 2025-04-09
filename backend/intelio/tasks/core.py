from celery import shared_task
from django.contrib.contenttypes.models import ContentType

from entries.models import Entry
from intelio.models.base import BaseDigest, EnricherSettings
from user.models import CradleUser


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
    pass


@shared_task
def start_digest(digest_id):
    digest = BaseDigest.objects.get(id=digest_id)
    digest.digest()


@shared_task
def propagate_acvec(digest_id):
    digest = BaseDigest.objects.get(id=digest_id)
    digest.update_access_vector()
