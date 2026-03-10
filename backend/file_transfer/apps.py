"""Django app configuration for file transfer.

Handles presigned URL uploads, file storage (S3/MinIO), and file metadata.
"""

from django.apps import AppConfig


class FileTransferConfig(AppConfig):
    """App config for file_transfer: uploads, downloads, and file metadata."""

    name = "file_transfer"
    verbose_name = "File Transfer"

    def ready(self) -> None:
        """Best-effort ensure our S3/MinIO buckets exist.

        This avoids runtime `NoSuchBucket` errors when generating presigned URLs or
        saving via django-storages. Failures are logged but never crash startup.
        """
        import logging
        import os

        logger = logging.getLogger("django.request")
        enabled = os.environ.get("CRADLE_AUTO_CREATE_BUCKETS", "1").lower() in (
            "1",
            "true",
            "yes",
            "on",
        )
        if not enabled:
            return

        try:
            from .s3_utils import ensure_cradle_buckets_exist

            ensure_cradle_buckets_exist()
        except Exception as e:
            logger.warning(f"Bucket auto-create skipped/failed: {e}")
