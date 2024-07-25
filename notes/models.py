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
    author = models.ForeignKey(
        CradleUser, related_name="author", on_delete=models.SET_NULL, null=True
    )

    objects = NoteManager()

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

        archived_note.save()
        super().delete()


class ArchivedNote(models.Model):
    id: models.UUIDField = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False
    )
    content: models.CharField = models.CharField()
    timestamp: models.DateTimeField = models.DateTimeField()
    publishable: models.BooleanField = models.BooleanField(default=False)
