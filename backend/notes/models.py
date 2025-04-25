from django.contrib.contenttypes.fields import GenericRelation
from django.db import models
from django_lifecycle import AFTER_CREATE, AFTER_UPDATE, hook
from django_lifecycle.mixins import LifecycleModelMixin, transaction

from intelio.models.base import BaseDigest

from .markdown.to_links import Node, cradle_connections, compress_tree
from entries.models import Entry, Relation
from logs.models import LoggableModelMixin
from .managers import NoteManager

import uuid
from user.models import CradleUser
from core.fields import BitStringField
from management.settings import cradle_settings


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

    last_linked = models.DateTimeField(default=None, null=True)

    _reference_tree = None

    @property
    def reference_tree(self) -> Node:
        if self._reference_tree is None:
            tree = cradle_connections(self.content, str(self.id))
            compress_tree(tree, cradle_settings.notes.max_clique_size)
            self._reference_tree = tree

        return self._reference_tree

    def propagate_from(self, log):
        return

    def delete(self):
        super().delete()

    @hook(AFTER_CREATE)
    def after_create(self):
        from .tasks import propagate_acvec

        transaction.on_commit(lambda: propagate_acvec.apply_async((self.id,)))

    @hook(AFTER_UPDATE, when="access_vector", has_changed=True)
    def after_access_vector_update(self):
        from .tasks import propagate_acvec

        transaction.on_commit(lambda: propagate_acvec.apply_async((self.id,)))


class ArchivedNote(models.Model):
    id: models.UUIDField = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False
    )
    content: models.CharField = models.CharField()
    timestamp: models.DateTimeField = models.DateTimeField()
    publishable: models.BooleanField = models.BooleanField(default=False)
