"""Abstract base model for pending uploads."""

import logging
import uuid

from django.db import models
from django.utils import timezone

from file_transfer.s3_utils import delete_object

logger = logging.getLogger(__name__)


class PendingUploadQuerySet(models.QuerySet):
    def expired(self):
        """Return uploads whose presigned URL has expired without being finalized."""
        return self.filter(expires_at__lt=timezone.now())


class BasePendingUpload(models.Model):
    """Abstract base for tracking pending uploads.

    Provides common fields and behavior for tracking presigned URL uploads
    that have been initiated but not yet finalized.
    """

    id: models.UUIDField = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False, help_text="Unique upload session identifier"
    )
    object_key: models.CharField = models.CharField(
        max_length=512, help_text="S3 object key where the file will be stored"
    )
    file_name: models.CharField = models.CharField(max_length=255, help_text="Original filename provided by the user")
    user: models.ForeignKey = models.ForeignKey(
        "user.CradleUser",
        related_name="%(class)s_set",  # Generates unique related_name per subclass
        on_delete=models.CASCADE,
        help_text="User who initiated the upload",
    )
    created_at: models.DateTimeField = models.DateTimeField(
        auto_now_add=True, help_text="When the upload was initiated"
    )
    expires_at: models.DateTimeField = models.DateTimeField(
        help_text="When the presigned URL expires and the upload session becomes invalid"
    )

    objects = PendingUploadQuerySet.as_manager()

    class Meta:
        abstract = True
        indexes = [
            models.Index(fields=["expires_at"]),
        ]

    @property
    def is_expired(self) -> bool:
        """Check if the upload has expired."""
        return timezone.now() > self.expires_at

    def discard(self, bucket_name: str) -> bool:
        """Delete the uploaded object (if any) from ``bucket_name`` and this record.

        Returns False if the object could not be deleted (logged); the record is deleted either way.
        Deleting a missing object succeeds, so no existence check is needed.
        """
        try:
            delete_object(bucket_name, self.object_key)
            removed = True
        except Exception:
            logger.exception("Could not delete uploaded object %s", self.object_key)
            removed = False
        self.delete()
        return removed
