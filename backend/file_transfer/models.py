from django.db import models
from typing import TYPE_CHECKING
from django_lifecycle import AFTER_CREATE, AFTER_DELETE, LifecycleModelMixin, hook
import uuid
from .utils import MinioClient
from entries.enums import EntryType
from entries.models import Entry, EntryClass, Relation
from management.settings import cradle_settings

if TYPE_CHECKING:
    pass


class FileReference(models.Model, LifecycleModelMixin):
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

    @property
    def entities(self) -> list[str]:
        if self.note:
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
            name=f"{self.bucket_name}/{self.file_name}_{self.minio_file_name}",
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

        process_file_task.apply_async(args=(str(self.id),))

    @hook(AFTER_DELETE)
    def delete_file(self):
        """
        Delete the file from MinIO after it is deleted from the database.
        """
        minio_client = MinioClient()
        minio_client.delete_files(self.bucket_name, [self.minio_file_name])
