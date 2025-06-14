from django.db import models
from typing import TYPE_CHECKING
import uuid

if TYPE_CHECKING:
    pass


class FileReference(models.Model):
    id: models.UUIDField = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False
    )
    timestamp: models.DateTimeField = models.DateTimeField(auto_now_add=True)

    minio_file_name: models.CharField = models.CharField()
    file_name: models.CharField = models.CharField()
    bucket_name: models.CharField = models.CharField()

    note: models.ForeignKey = models.ForeignKey(
        "notes.Note",
        related_name="files",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
    )
    report: models.ForeignKey = models.OneToOneField(
        "publish.PublishedReport",
        related_name="file",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
    )
    digest: models.ForeignKey = models.ForeignKey(
        "intelio.BaseDigest",
        related_name="files",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
    )

    md5_hash: models.CharField = models.CharField(max_length=32, null=True, blank=True)
    sha1_hash: models.CharField = models.CharField(max_length=40, null=True, blank=True)
    sha256_hash: models.CharField = models.CharField(
        max_length=64, null=True, blank=True
    )
    mimetype: models.CharField = models.CharField(max_length=255, null=True, blank=True)

    def to_dict(self) -> dict[str, str]:
        return {
            "minio_file_name": self.minio_file_name,
            "file_name": self.file_name,
            "bucket_name": self.bucket_name,
        }
