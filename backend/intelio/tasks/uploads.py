"""Tasks for cleaning up expired digest uploads."""

from celery import shared_task

from file_transfer.storage import DigestStorage
from file_transfer.uploads.tasks import cleanup_all_expired_uploads, cleanup_expired_upload_generic


@shared_task
def cleanup_expired_digest_upload(pending_upload_id: str):
    """Clean up an expired pending digest upload.

    Deprecated: This task delegates to the generic cleanup task.
    Use file_transfer.uploads.tasks.cleanup_expired_upload_generic instead.
    """
    cleanup_expired_upload_generic(
        pending_upload_id,
        "intelio.PendingDigestUpload",
        DigestStorage.bucket_name,
    )


@shared_task
def cleanup_expired_digest_uploads():
    """Periodic cleanup of all expired pending digest uploads.

    Deprecated: This task delegates to the generic cleanup task.
    Use file_transfer.uploads.tasks.cleanup_all_expired_uploads instead.
    """
    cleanup_all_expired_uploads()
