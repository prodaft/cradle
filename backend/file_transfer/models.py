"""File transfer models for storing file references and tracking pending uploads.

FileReference stores metadata for files uploaded via presigned URLs. PendingUpload
tracks uploads in progress until they are finalized or expire.
"""

import uuid

from django.db import models
from django_lifecycle import AFTER_CREATE, LifecycleModelMixin, hook

from entries.constants import INTERNAL_ENTRY_CLASS_DEFAULTS, SUBTYPE_FILE
from entries.enums import EntryType
from entries.models import Entry, EntryClass
from management.settings import cradle_settings

from .storage import FileTransferStorage
from .uploads.models import BasePendingUpload


def file_upload_path(instance: "FileReference", filename: str) -> str:
    """Generate upload path: {uuid}-{filename}."""
    return f"{instance.id}-{filename}"


class PendingUpload(BasePendingUpload):
    """Tracks pending file uploads that have been initiated but not yet finalized.

    Used to manage presigned URL uploads and cleanup of abandoned uploads.
    """

    class Meta:
        db_table = "file_transfer_pendingupload"


class FileReference(models.Model, LifecycleModelMixin):
    """Metadata record for a file stored in S3/MinIO.

    Links files to notes, digests, or users. Supports automatic hash calculation
    and mimetype detection via process_file().
    """

    id: models.UUIDField = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False, help_text="Unique identifier for the file reference"
    )
    timestamp: models.DateTimeField = models.DateTimeField(
        auto_now_add=True, help_text="When the file was first uploaded"
    )

    file: models.FileField = models.FileField(
        upload_to=file_upload_path,
        storage=FileTransferStorage,
        null=True,
        blank=True,
        help_text="Reference to the file in S3/MinIO storage",
    )

    minio_file_name: models.CharField = models.CharField(
        max_length=255, null=True, blank=True, help_text="Legacy: object key from old MinIO storage"
    )
    file_name: models.CharField = models.CharField(
        max_length=255, null=True, blank=True, help_text="Original filename for display and download"
    )
    bucket_name: models.CharField = models.CharField(
        max_length=255, null=True, blank=True, help_text="Legacy: bucket name from old MinIO storage"
    )

    note: models.ForeignKey = models.ForeignKey(
        "notes.Note",
        related_name="files",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        help_text="Note this file is attached to, if any",
    )
    digest: models.ForeignKey = models.ForeignKey(
        "intelio.BaseDigest",
        related_name="files",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        help_text="Digest this file belongs to, if any",
    )
    user: models.ForeignKey = models.ForeignKey(
        "user.CradleUser",
        related_name="files",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        help_text="User who uploaded the file",
    )

    md5_hash: models.CharField = models.CharField(
        max_length=32, null=True, blank=True, help_text="MD5 hash of file contents"
    )
    sha1_hash: models.CharField = models.CharField(
        max_length=40, null=True, blank=True, help_text="SHA-1 hash of file contents"
    )
    sha256_hash: models.CharField = models.CharField(
        max_length=64, null=True, blank=True, help_text="SHA-256 hash of file contents"
    )
    mimetype: models.CharField = models.CharField(
        max_length=255, null=True, blank=True, help_text="MIME type detected from file content"
    )
    file_size: models.BigIntegerField = models.PositiveBigIntegerField(
        null=True, blank=True, help_text="File size in bytes"
    )

    @property
    def entities(self) -> list[Entry]:
        """Entity entries linked to this file's note (for relation creation)."""
        if self.note:
            # Use prefetched data if available to avoid N+1 queries
            if hasattr(self.note, "_prefetched_objects_cache") and "entries" in self.note._prefetched_objects_cache:
                return [entry for entry in self.note.entries.all() if entry.entry_class.type == EntryType.ENTITY]
            return list(self.note.entries.filter(entry_class__type=EntryType.ENTITY).all())
        return []

    @property
    def entry(self) -> Entry:
        """Artifact entry representing this file (for relations and linking)."""
        file_class, _ = EntryClass.objects.get_or_create(
            subtype=SUBTYPE_FILE, defaults=INTERNAL_ENTRY_CLASS_DEFAULTS[SUBTYPE_FILE]
        )

        entry, _ = Entry.objects.get_or_create(
            entry_class=file_class,
            name=f"{self.id}-{self.file_name}",
        )

        return entry

    def process_file(self):
        """Process the file after it is created.

        Schedules the file processing task (hashes, mimetype). Note linking
        is handled inside the task when a note is attached.
        """
        from .tasks import process_file_task

        try:
            # Try to run asynchronously first
            process_file_task.apply_async(args=(str(self.id),))
        except Exception:
            # If async fails (no Celery workers), run synchronously
            process_file_task(str(self.id))

    @hook(AFTER_CREATE)
    def auto_process_file(self):
        """Automatically process the file after it is created.

        Ensures hashes are calculated immediately upon file creation.
        """
        if cradle_settings.files.autoprocess_files:
            self.process_file()
