from django.contrib.contenttypes.fields import GenericRelation
from django.db import models
from django_lifecycle.mixins import LifecycleModelMixin

from intelio.models.base import BaseDigest

from .markdown.to_links import LinkTreeNode, cradle_connections, heading_hierarchy
from entries.models import Entry, Relation
from logs.models import LoggableModelMixin
from .managers import NoteManager

import uuid
from user.models import CradleUser
from core.fields import BitStringField


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

    digest = models.ForeignKey(
        BaseDigest, related_name="notes", null=True, on_delete=models.CASCADE
    )

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
