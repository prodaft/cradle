from django.db import connection, models

from .markdown.parser import LinkTreeNode, cradle_connections, heading_hierarchy
from entries.models import Entry
from logs.models import LoggableModelMixin
from .managers import NoteManager
from django.contrib.contenttypes.fields import GenericForeignKey, GenericRelation
from django.contrib.contenttypes.models import ContentType
from django_lifecycle import (
    AFTER_CREATE,
    AFTER_DELETE,
    LifecycleModel,
    hook,
    BEFORE_UPDATE,
    AFTER_UPDATE,
)
import json

import uuid
from user.models import CradleUser


class Relation(LifecycleModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    src_entry = models.ForeignKey(
        Entry, related_name="src_relations", on_delete=models.CASCADE
    )
    dst_entry = models.ForeignKey(
        Entry, related_name="dst_relations", on_delete=models.CASCADE
    )

    # Generic foreign key to support different types of objects
    object_id = models.UUIDField()
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    content_object = GenericForeignKey("content_type", "object_id")

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["src_entry", "dst_entry", "content_type", "object_id"],
                name="unique_src_dst_object",
            )
        ]

    indexes = [
        models.Index(fields=["src_entry"], name="idx_src_entry"),
        models.Index(fields=["dst_entry"], name="idx_dst_entry"),
        models.Index(fields=["content_type", "object_id"], name="idx_content_object"),
    ]


class Note(models.Model, LoggableModelMixin):
    id: models.UUIDField = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False
    )
    content: models.CharField = models.CharField()
    publishable: models.BooleanField = models.BooleanField(default=False)
    timestamp: models.DateTimeField = models.DateTimeField(auto_now_add=True)

    entries: models.ManyToManyField = models.ManyToManyField(
        Entry, related_name="notes"
    )
    author = models.ForeignKey[CradleUser](
        CradleUser, related_name="author", on_delete=models.SET_NULL, null=True
    )

    editor = models.ForeignKey[CradleUser](
        CradleUser, related_name="editor", on_delete=models.SET_NULL, null=True
    )

    edit_timestamp: models.DateTimeField = models.DateTimeField(null=True)

    objects: NoteManager = NoteManager()

    relations = GenericRelation(Relation, related_query_name="note")

    _reference_tree = None

    @property
    def reference_tree(self) -> LinkTreeNode:
        if self._reference_tree is None:
            flattree = cradle_connections(self.content)
            self._reference_tree = heading_hierarchy(flattree)

        return self._reference_tree

    def propagate_from(self, log):
        return

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
