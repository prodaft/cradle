"""Abstract base model for pending uploads."""

import uuid

from django.db import models
from django.utils import timezone


class BasePendingUpload(models.Model):
    """
    Abstract base for tracking pending uploads.

    Provides common fields and behavior for tracking presigned URL uploads
    that have been initiated but not yet finalized.
    """

    id: models.UUIDField = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False
    )
    object_key: models.CharField = models.CharField(max_length=512)
    file_name: models.CharField = models.CharField(max_length=255)
    user: models.ForeignKey = models.ForeignKey(
        "user.CradleUser",
        related_name="%(class)s_set",  # Generates unique related_name per subclass
        on_delete=models.CASCADE,
    )
    created_at: models.DateTimeField = models.DateTimeField(auto_now_add=True)
    expires_at: models.DateTimeField = models.DateTimeField()

    class Meta:
        abstract = True
        indexes = [
            models.Index(fields=["expires_at"]),
        ]

    @property
    def is_expired(self) -> bool:
        """Check if the upload has expired."""
        return timezone.now() > self.expires_at

    def get_bucket_name(self) -> str:
        """
        Get the S3 bucket name for this upload.

        Must be implemented by concrete subclasses.

        Returns:
            str: The S3 bucket name (e.g., "cradle-files")

        Raises:
            NotImplementedError: If not overridden in subclass
        """
        raise NotImplementedError(
            f"{self.__class__.__name__} must implement get_bucket_name()"
        )
