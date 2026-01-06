import uuid

from django.db import models
from django.utils import timezone


class PendingDigestUpload(models.Model):
    """
    Tracks pending digest uploads that have been initiated but not yet finalized.

    The `id` doubles as the future digest ID to keep the S3 object key deterministic:
    object_key == "{user_id}/{id}" (matches BaseDigest.storage_key).
    """

    id: models.UUIDField = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False
    )
    object_key: models.CharField = models.CharField(max_length=512)
    file_name: models.CharField = models.CharField(max_length=255)
    user: models.ForeignKey = models.ForeignKey(
        "user.CradleUser",
        related_name="pending_digest_uploads",
        on_delete=models.CASCADE,
    )
    created_at: models.DateTimeField = models.DateTimeField(auto_now_add=True)
    expires_at: models.DateTimeField = models.DateTimeField()

    class Meta:
        indexes = [
            models.Index(fields=["expires_at"]),
        ]

    @property
    def is_expired(self) -> bool:
        return timezone.now() > self.expires_at
