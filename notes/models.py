from django.db import models
from entries.models import Entry
from .managers import NoteManager
import uuid
from user.models import CradleUser


class Note(models.Model):
    id: models.UUIDField = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False
    )
    content: models.CharField = models.CharField()
    publishable: models.BooleanField = models.BooleanField(default=False)
    timestamp: models.DateTimeField = models.DateTimeField(auto_now_add=True)

    entries: models.ManyToManyField = models.ManyToManyField(Entry)
    author = models.ForeignKey[CradleUser](
        CradleUser, related_name="author", on_delete=models.SET_NULL, null=True
    )

    editor = models.ForeignKey[CradleUser](
        CradleUser, related_name="editor", on_delete=models.SET_NULL, null=True
    )

    edit_timestamp: models.DateTimeField = models.DateTimeField(null=True)

    objects: NoteManager = NoteManager()

    def delete(self):
        """Override the delete method to archive the note before deleting it.
        A new note with the same content, timestamp, and publishable status
        will be created in the ArchivedNote table.

        Args:

        Returns:
        """

        archived_note = ArchivedNote(
            content=self.content,
            timestamp=self.timestamp,
            publishable=self.publishable,
        )

        artifact_ids = self.entries.is_artifact().values_list("id", flat=True)
        archived_note.save()
        super().delete()

        Entry.objects.filter(id__in=artifact_ids).unreferenced().delete()


class ArchivedNote(models.Model):
    id: models.UUIDField = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False
    )
    content: models.CharField = models.CharField()
    timestamp: models.DateTimeField = models.DateTimeField()
    publishable: models.BooleanField = models.BooleanField(default=False)


class Relation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    src_entry = models.ForeignKey(
        Entry, related_name="src_relations", on_delete=models.CASCADE
    )
    dst_entry = models.ForeignKey(
        Entry, related_name="dst_relations", on_delete=models.CASCADE
    )
    note = models.ForeignKey(Note, related_name="relations", on_delete=models.CASCADE)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["src_entry", "dst_entry", "note"], name="unique_src_dst_note"
            )
        ]

    indexes = [
        models.Index(fields=["src_entry"], name="idx_src_entry"),
        models.Index(fields=["note"], name="idx_note"),
    ]
