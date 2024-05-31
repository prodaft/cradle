from django.db import models
from entities.models import Entity
from .managers import NoteManager


class Note(models.Model):
    content: models.CharField = models.CharField()
    publishable: models.BooleanField = models.BooleanField(default=False)
    timestamp: models.DateTimeField = models.DateTimeField(auto_now_add=True)
    entities: models.ManyToManyField = models.ManyToManyField(Entity)

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
    content: models.CharField = models.CharField()
    timestamp: models.DateTimeField = models.DateTimeField()
    publishable: models.BooleanField = models.BooleanField(default=False)
