from django.db import models
from django_lifecycle.mixins import AFTER_UPDATE, LifecycleModelMixin

from .markdown.to_links import LinkTreeNode, cradle_connections, heading_hierarchy
from entries.models import Entry
from logs.models import LoggableModelMixin
from .managers import NoteManager
from django.contrib.contenttypes.fields import GenericForeignKey, GenericRelation
from django.contrib.contenttypes.models import ContentType
from django_lifecycle import AFTER_SAVE, LifecycleModel, hook

import uuid
from user.models import CradleUser
from core.fields import BitStringField


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

    access_vector: BitStringField = BitStringField(
        max_length=2048, null=False, default=1 << 2047, varying=False
    )

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


class Note(LifecycleModelMixin, LoggableModelMixin, models.Model):
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

    access_vector: BitStringField = BitStringField(
        max_length=2048, null=False, default=1 << 2047, varying=False
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
        super().delete()


class ArchivedNote(models.Model):
    id: models.UUIDField = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False
    )
    content: models.CharField = models.CharField()
    timestamp: models.DateTimeField = models.DateTimeField()
    publishable: models.BooleanField = models.BooleanField(default=False)
