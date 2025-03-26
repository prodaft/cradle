from celery import shared_task

from ..enums import DigestStatus
from ..models.base import BaseDigest


@shared_task
def digest_chunk(digest_id, obj, last):
    """
    Downloads a file from the given URL, stores it in Minio, and attaches
    the resulting FileReference to the Note with the provided note_id.
    """
    digest = BaseDigest.objects.get(id=digest_id)

    if digest.status == DigestStatus.ERROR:
        return

    digest.digest_chunk(obj)

    if len(digest.errors) > 0:
        digest.status = DigestStatus.ERROR
        digest.save()
        return
    elif last:
        digest.status = DigestStatus.DONE
        digest.save()
