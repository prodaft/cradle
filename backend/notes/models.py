"""Note and snippet models for the notes app."""

import uuid

from django.contrib.contenttypes.fields import GenericRelation
from django.db import models
from django.utils import timezone
from django_lifecycle import AFTER_CREATE, AFTER_UPDATE, hook
from django_lifecycle.mixins import LifecycleModelMixin, transaction

from access.enums import AccessType
from access.models import Access
from core.fields import BitStringField
from entries.enums import EntryType
from entries.models import Entry, Relation
from intelio.models.base import BaseDigest
from logs.models import LoggableModelMixin
from management.settings import cradle_settings
from user.models import CradleUser

from .enums import NoteStatus
from .managers import NoteManager
from .markdown.to_links import Node, compress_tree, cradle_connections


class Note(LifecycleModelMixin, LoggableModelMixin, models.Model):
    """A note linking entries via cradle markdown syntax. Supports fleeting (quick) and finalized notes."""

    metadata_fields = {
        "entries": None,
        "title": "title",
        "description": "description",
    }

    id: models.UUIDField = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False, help_text="Unique identifier for the note."
    )
    content: models.CharField = models.CharField(help_text="Markdown content with cradle links.")
    timestamp: models.DateTimeField = models.DateTimeField(auto_now_add=True, help_text="When the note was created.")
    fleeting: models.BooleanField = models.BooleanField(
        default=False, help_text="If true, note bypasses entity/entry validation (quick notes)."
    )

    status: models.CharField = models.CharField(
        max_length=20,
        choices=NoteStatus.choices,
        default=NoteStatus.HEALTHY,
        help_text="Processing status: healthy, processing, warning, or invalid.",
    )
    status_message: models.CharField = models.CharField(
        default="", help_text="Message describing status (e.g. validation error)."
    )
    status_timestamp: models.DateTimeField = models.DateTimeField(
        null=True, help_text="When the status was last updated."
    )

    entries: models.ManyToManyField = models.ManyToManyField(
        Entry, related_name="notes", help_text="Entries referenced by this note."
    )

    title: models.CharField = models.CharField(
        max_length=255, default="", help_text="Note title from metadata or first heading."
    )
    description: models.TextField = models.TextField(
        default="", max_length=4096, help_text="Note description from metadata or first paragraph."
    )
    metadata: models.JSONField = models.JSONField(
        default=dict, blank=True, null=True, help_text="Additional metadata from frontmatter."
    )
    content_offset: models.IntegerField = models.IntegerField(
        default=0, help_text="Byte offset where content starts (after frontmatter)."
    )

    author = models.ForeignKey[CradleUser](
        CradleUser,
        related_name="author",
        on_delete=models.SET_NULL,
        null=True,
        help_text="User who created the note.",
    )

    editor = models.ForeignKey[CradleUser](
        CradleUser,
        related_name="editor",
        on_delete=models.SET_NULL,
        null=True,
        help_text="User who last edited the note.",
    )

    access_vector: BitStringField = BitStringField(
        max_length=2048,
        null=False,
        default=1 << 2047,
        varying=False,
        help_text="Bitmask for access control; entities with matching bits can read.",
    )

    edit_timestamp: models.DateTimeField = models.DateTimeField(null=True, help_text="When the note was last edited.")

    objects: NoteManager = NoteManager()

    relations = GenericRelation(Relation, related_query_name="note")

    digest = models.ForeignKey(
        BaseDigest,
        related_name="notes",
        null=True,
        on_delete=models.CASCADE,
        help_text="Digest this note was imported from, if any.",
    )

    last_linked = models.DateTimeField(
        default=None, null=True, help_text="When relations were last computed from this note."
    )

    _reference_tree = None

    class Meta:
        indexes = [
            models.Index(fields=["-timestamp", "fleeting"]),  # For get_accessible_notes ordering
            models.Index(fields=["fleeting", "timestamp"]),  # Alternative order
            models.Index(fields=["author", "-timestamp"]),  # For author filtering
            models.Index(fields=["editor", "-edit_timestamp"]),  # For editor filtering
        ]

    def set_status(self, status: NoteStatus, message: str = ""):
        self.status = status
        self.status_message = message
        self.status_timestamp = timezone.now()

    @property
    def reference_tree(self) -> Node:
        if self._reference_tree is None:
            tree = cradle_connections(self.content, str(self.id))
            compress_tree(tree, cradle_settings.notes.max_clique_size)
            self._reference_tree = tree

        return self._reference_tree

    def propagate_from(self, _log):
        """No-op: Note does not propagate logs to related objects."""
        return

    def has_read_access(self, user: CradleUser) -> bool:
        """Return whether the user may view this note."""
        if user.is_cradle_admin:
            return True

        if self.fleeting:
            return self.author_id == user.id

        return Access.objects.has_access_to_entities(
            user,
            set(self.entries.filter(entry_class__type=EntryType.ENTITY)),
            {AccessType.READ, AccessType.READ_WRITE},
        )

    def has_write_access(self, user: CradleUser) -> bool:
        """Return whether the user may edit, upload files to, or delete this note."""
        if user.is_cradle_admin:
            return True

        if self.fleeting:
            return self.author_id == user.id

        entities = set(self.entries.filter(entry_class__type=EntryType.ENTITY))
        has_entity_write = Access.objects.has_access_to_entities(
            user,
            entities,
            {AccessType.READ_WRITE},
        )
        return has_entity_write and self.author_id == user.id

    def get_user_permission(self, user: CradleUser) -> AccessType:
        """Return the user's effective permission for this note."""
        if self.has_write_access(user):
            return AccessType.READ_WRITE
        if self.has_read_access(user):
            return AccessType.READ
        return AccessType.NONE

    @hook(AFTER_CREATE)
    def after_create(self):
        from .tasks import propagate_acvec

        transaction.on_commit(lambda: propagate_acvec.apply_async((self.id,)))

    @hook(AFTER_UPDATE, when="access_vector", has_changed=True)
    def after_access_vector_update(self):
        from .tasks import propagate_acvec

        transaction.on_commit(lambda: propagate_acvec.apply_async((self.id,)))


class ArchivedNote(models.Model):
    """Archived copy of a note, used for history/audit."""

    id: models.UUIDField = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False, help_text="Unique identifier."
    )
    content: models.CharField = models.CharField(help_text="Archived note content.")
    timestamp: models.DateTimeField = models.DateTimeField(help_text="When the note was archived.")


class Snippet(models.Model):
    """Reusable text snippet for note templates. Can be user-owned or system-wide (owner=null)."""

    id: models.UUIDField = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False, help_text="Unique identifier."
    )
    owner = models.ForeignKey(
        CradleUser,
        related_name="snippets",
        on_delete=models.CASCADE,
        null=True,
        help_text="Owner of the snippet; null for system snippets.",
    )
    default: models.BooleanField = models.BooleanField(
        default=False, help_text="Whether this is the default snippet for new notes."
    )
    name: models.CharField = models.CharField(max_length=255, help_text="Display name of the snippet.")
    content: models.TextField = models.TextField(help_text="Snippet content (markdown).")
    created_on: models.DateTimeField = models.DateTimeField(
        auto_now_add=True, help_text="When the snippet was created."
    )

    def __str__(self):
        return self.name
