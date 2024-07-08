from django.db import models
import uuid


class FileReference(models.Model):
    id: models.UUIDField = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False
    )
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
    fleeting_note: models.ForeignKey = models.ForeignKey(
        "fleeting_notes.FleetingNote",
        related_name="files",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
    )

    def to_dict(self) -> dict[str, str]:
        """Provides a dictionary representation of the FileReference
        entry.

        Returns:
            The dictionary representation of the entry.
        """

        return {
            "minio_file_name": self.minio_file_name,
            "file_name": self.file_name,
            "bucket_name": self.bucket_name,
        }
