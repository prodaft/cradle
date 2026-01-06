import logging

from celery import shared_task
from django.utils import timezone

from file_transfer.s3_utils import delete_object
from file_transfer.storage import DigestStorage

from ..models.uploads import PendingDigestUpload

logger = logging.getLogger("django.request")


@shared_task
def cleanup_expired_digest_upload(pending_upload_id: str):
    """
    Clean up an expired pending digest upload.

    Deletes the PendingDigestUpload record and removes the uploaded object from
    DigestStorage if it exists.
    """
    try:
        pending_upload = PendingDigestUpload.objects.get(id=pending_upload_id)
    except PendingDigestUpload.DoesNotExist:
        return

    if not pending_upload.is_expired:
        return

    storage = DigestStorage()
    if storage.exists(pending_upload.object_key):
        try:
            delete_object(DigestStorage.bucket_name, pending_upload.object_key)
            logger.info(f"Deleted orphaned digest upload: {pending_upload.object_key}")
        except Exception as e:
            logger.error(
                f"Failed to delete orphaned digest upload {pending_upload.object_key}: {str(e)}"
            )

    pending_upload.delete()


@shared_task
def cleanup_expired_digest_uploads():
    """Periodic cleanup of all expired pending digest uploads."""
    expired_uploads = PendingDigestUpload.objects.filter(expires_at__lt=timezone.now())
    storage = DigestStorage()

    for pending_upload in expired_uploads:
        if storage.exists(pending_upload.object_key):
            try:
                delete_object(DigestStorage.bucket_name, pending_upload.object_key)
            except Exception:
                pass
        pending_upload.delete()


