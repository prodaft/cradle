"""Generic cleanup tasks for pending uploads."""

import logging

from celery import shared_task
from django.apps import apps

from file_transfer.storage import DigestStorage, FileTransferStorage

logger = logging.getLogger("django.request")


@shared_task
def cleanup_expired_upload_generic(
    pending_upload_id: str,
    model_path: str,
    bucket_name: str,
):
    """Generic cleanup task for any pending upload model.

    This task is scheduled when an upload is initiated and runs after
    the upload expires. It deletes both the S3 object and the database record.

    Args:
        pending_upload_id: UUID of the pending upload.
        model_path: Full model path (e.g., "file_transfer.PendingUpload").
        bucket_name: S3 bucket name where file was uploaded.

    Example:
        >>> cleanup_expired_upload_generic.apply_async(
        ...     args=("abc-123", "file_transfer.PendingUpload", "cradle-files"),
        ...     countdown=300
        ... )
    """
    try:
        app_label, model_name = model_path.rsplit(".", 1)
        Model = apps.get_model(app_label, model_name)
    except (ValueError, LookupError) as e:
        logger.error(f"Invalid model path {model_path}: {e}")
        return

    try:
        pending = Model.objects.get(id=pending_upload_id)
    except Model.DoesNotExist:
        logger.debug(f"Pending upload {pending_upload_id} not found (already cleaned up)")
        return

    if not pending.is_expired:
        logger.debug(f"Pending upload {pending_upload_id} not yet expired, skipping cleanup")
        return

    pending.discard(bucket_name)
    logger.info(f"Cleaned up expired pending upload: {pending_upload_id}")


@shared_task
def cleanup_all_expired_uploads():
    """Periodic task to clean up all expired pending uploads.

    This task should be scheduled to run periodically (e.g., every 10 minutes)
    via Celery Beat. It scans all pending upload models and cleans up expired ones.

    This serves as a backup in case individual cleanup tasks fail or Celery
    is temporarily unavailable.

    Example celerybeat schedule:
        >>> CELERYBEAT_SCHEDULE = {
        ...     'cleanup-expired-uploads': {
        ...         'task': 'file_transfer.uploads.tasks.cleanup_all_expired_uploads',
        ...         'schedule': crontab(minute='*/10'),
        ...     },
        ... }
    """
    from file_transfer.models import PendingUpload

    expired_file_uploads = PendingUpload.objects.expired()
    for pending in expired_file_uploads:
        try:
            cleanup_expired_upload_generic(
                str(pending.id),
                "file_transfer.PendingUpload",
                FileTransferStorage.bucket_name,
            )
        except Exception as e:
            logger.error(f"Error cleaning up file upload {pending.id}: {e}")

    PendingDigestUpload = apps.get_model("intelio", "PendingDigestUpload")
    expired_digest_uploads = PendingDigestUpload.objects.expired()
    digest_count = expired_digest_uploads.count()
    for pending in expired_digest_uploads:
        try:
            cleanup_expired_upload_generic(
                str(pending.id),
                "intelio.PendingDigestUpload",
                DigestStorage.bucket_name,
            )
        except Exception as e:
            logger.error(f"Error cleaning up digest upload {pending.id}: {e}")

    logger.info(f"Cleaned up {expired_file_uploads.count()} file uploads and {digest_count} digest uploads")
