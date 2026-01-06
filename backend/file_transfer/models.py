import uuid
from typing import TYPE_CHECKING

from django.db import models
from django.utils import timezone
from django_lifecycle import AFTER_CREATE, LifecycleModelMixin, hook

from entries.enums import EntryType
from entries.models import Entry, EntryClass
from management.settings import cradle_settings

from .storage import FileTransferStorage
from .uploads.models import BasePendingUpload

if TYPE_CHECKING:
    pass


def file_upload_path(instance: "FileReference", filename: str) -> str:
    """Generate upload path: {uuid}-{filename}"""
    return f"{instance.id}-{filename}"


class PendingUpload(BasePendingUpload):
    """
    Tracks pending file uploads that have been initiated but not yet finalized.
    Used to manage presigned URL uploads and cleanup of abandoned uploads.
    """

    class Meta:
        db_table = "file_transfer_pendingupload"

    def get_bucket_name(self) -> str:
        """Get the S3 bucket name for file transfers."""
        return FileTransferStorage.bucket_name


class FileReference(models.Model, LifecycleModelMixin):
    id: models.UUIDField = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False
    )
    timestamp: models.DateTimeField = models.DateTimeField(auto_now_add=True)

    # New django-storages FileField
    file: models.FileField = models.FileField(
        upload_to=file_upload_path,
        storage=FileTransferStorage,
        null=True,
        blank=True,
    )

    # Legacy fields for migration from old MinIO storage (and for display/download filename)
    minio_file_name: models.CharField = models.CharField(
        max_length=255, null=True, blank=True
    )
    file_name: models.CharField = models.CharField(
        max_length=255, null=True, blank=True
    )
    bucket_name: models.CharField = models.CharField(
        max_length=255, null=True, blank=True
    )

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
    user: models.ForeignKey = models.ForeignKey(
        "user.CradleUser",
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
    file_size: models.BigIntegerField = models.PositiveBigIntegerField(
        null=True, blank=True
    )

    def to_dict(self) -> dict[str, str | None]:
        return {
            "minio_file_name": self.minio_file_name,
            "file_name": self.file_name,
            "bucket_name": self.bucket_name,
        }

    @property
    def entities(self) -> list[str]:
        if self.note:
            # Use prefetched data if available to avoid N+1 queries
            if (
                hasattr(self.note, "_prefetched_objects_cache")
                and "entries" in self.note._prefetched_objects_cache
            ):
                return [
                    entry
                    for entry in self.note.entries.all()
                    if entry.entry_class.type == EntryType.ENTITY
                ]
            return list(
                self.note.entries.filter(entry_class__type=EntryType.ENTITY).all()
            )
        return []

    @property
    def entry(self):
        file_class, _ = EntryClass.objects.get_or_create(
            type=EntryType.ARTIFACT, subtype="file"
        )

        entry, _ = Entry.objects.get_or_create(
            entry_class=file_class,
            name=f"{self.id}-{self.file_name}",
        )

        return entry

    def process_file(self):
        """
        Process the file after it is created.
        Schedules the file processing task.
        """
        if self.note is None:
            return

        from .tasks import process_file_task

        try:
            # Try to run asynchronously first
            process_file_task.apply_async(args=(str(self.id),))
        except Exception:
            # If async fails (no Celery workers), run synchronously
            process_file_task(str(self.id))

    @hook(AFTER_CREATE)
    def auto_process_file(self):
        """
        Automatically process the file after it is created.
        This ensures hashes are calculated immediately upon file creation.
        """
        if cradle_settings.files.autoprocess_files:
            self.process_file()
