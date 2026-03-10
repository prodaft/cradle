"""Abstract base model for pending uploads."""

import uuid

from django.db import models
from django.utils import timezone


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

    class Meta:
        abstract = True
        indexes = [
            models.Index(fields=["expires_at"]),
        ]

    @property
    def is_expired(self) -> bool:
        """Check if the upload has expired."""
        return timezone.now() > self.expires_at
