"""Note and snippet models for the notes app."""

import hashlib
import json
import uuid

from django.contrib.contenttypes.fields import GenericRelation
from django.core.serializers.json import DjangoJSONEncoder
from django.db import models
from django.utils import timezone
from django_lifecycle import AFTER_CREATE, AFTER_UPDATE, hook
from django_lifecycle.mixins import LifecycleModelMixin, transaction

from access.enums import AccessType
from access.models import Access
from core.fields import BitStringField
from entries.models import Entry, Relation
from intelio.models.base import BaseDigest
from logs.models import LoggableModelMixin
from management.settings import system_settings
from user.models import CradleUser

from .enums import NoteStatus
from .managers import NoteManager
from .markdown.to_links import Node, build_reference_tree, compress_tree


class Note(LifecycleModelMixin, LoggableModelMixin, models.Model):
    """A note linking entries via cradle markdown syntax. Supports fleeting (draft) and published notes."""

    metadata_fields = {
        "entries": None,
        "title": "title",
        "description": "description",
    }

    id: models.UUIDField = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False, help_text="Unique identifier for the note."
    )

    title: models.CharField = models.CharField(
        max_length=255, default="", help_text="Note title from metadata or first heading."
    )
    description: models.TextField = models.TextField(
        default="", max_length=4096, help_text="Note description from metadata or first paragraph."
    )
    content: models.CharField = models.CharField(help_text="Markdown content with cradle links.")
    content_offset: models.IntegerField = models.IntegerField(
        default=0, help_text="Byte offset where content starts (after frontmatter)."
    )
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

    status_issues: models.JSONField = models.JSONField(
        default=list,
        blank=True,
        help_text="Problem links behind an invalid status: [{code, key, value}], value null for a whole entry type.",
    )

    status_changed_at: models.DateTimeField = models.DateTimeField(
        null=True, help_text="When the status was last updated."
    )
    metadata: models.JSONField = models.JSONField(
        default=dict, blank=True, null=True, help_text="Additional metadata from frontmatter."
    )

    entries: models.ManyToManyField = models.ManyToManyField(
        Entry, related_name="notes", help_text="Entries referenced by this note."
    )

    digest = models.ForeignKey(
        BaseDigest,
        related_name="notes",
        null=True,
        on_delete=models.CASCADE,
        help_text="Digest this note was imported from, if any.",
    )

    access_vector: BitStringField = BitStringField(
        max_length=2048,
        null=False,
        default=1 << 2047,
        varying=False,
        help_text="Bitmask for access control; entities with matching bits can read.",
    )

    relations = GenericRelation(Relation, related_query_name="note")

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

    created_at: models.DateTimeField = models.DateTimeField(auto_now_add=True, help_text="When the note was created.")

    updated_at: models.DateTimeField = models.DateTimeField(null=True, help_text="When the note was last edited.")

    linked_at = models.DateTimeField(
        default=None, null=True, help_text="When relations were last computed from this note."
    )

    objects: NoteManager = NoteManager()

    _reference_tree = None

    class Meta:
        indexes = [
            models.Index(fields=["-created_at", "fleeting"]),  # For get_accessible_notes ordering
            models.Index(fields=["fleeting", "created_at"]),  # Alternative order
            models.Index(fields=["author", "-created_at"]),  # For author filtering
            models.Index(fields=["editor", "-updated_at"]),  # For editor filtering
        ]

    STATUS_FIELDS = ("status", "status_message", "status_changed_at", "status_issues")

    def set_status(self, status: NoteStatus, message: str = "", issues: list | None = None):
        self.status = status
        self.status_message = message
        self.status_issues = issues or []
        self.status_changed_at = timezone.now()

    def write_fields(self, *fields: str) -> None:
        """Write only ``fields`` to this note's row, without hooks or a full save.

        A background task must never overwrite a user's newer edit or re-insert a note deleted while it ran.
        """
        Note.objects.filter(pk=self.pk).update(**{f: getattr(self, f) for f in fields})

    def apply_metadata(self) -> list[str]:
        """Fill title, description, metadata and content offset from the content; return the fields it set.

        Values come from the frontmatter, falling back to the first heading and paragraph; fields with no value are
        reset to their defaults, and the stored metadata is made JSON-safe (e.g. YAML dates become strings).
        """
        from .markdown.to_metadata import infer_metadata  # it imports this module

        offset, metadata = infer_metadata(self.content)
        for key, field in self.metadata_fields.items():
            if field is None:
                metadata.pop(key, None)
            else:
                setattr(self, field, metadata.get(key, Note._meta.get_field(field).default))
        self.content_offset = offset
        self.metadata = json.loads(json.dumps(metadata, cls=DjangoJSONEncoder))
        return [f for f in self.metadata_fields.values() if f] + ["metadata", "content_offset"]

    def write_status(self, status: NoteStatus, message: str = "", issues: list | None = None) -> None:
        """Set the status and write only the status fields (see ``write_fields``)."""
        self.set_status(status, message, issues)
        self.write_fields(*self.STATUS_FIELDS)

    @property
    def reference_tree(self) -> Node:
        if self._reference_tree is None:
            tree = build_reference_tree(self.content, str(self.id))
            compress_tree(tree, system_settings.notes.max_clique_size)
            self._reference_tree = tree

        return self._reference_tree

    @property
    def content_hash(self) -> str:
        """SHA-256 of the content; clients send it back on edit to detect concurrent changes."""
        return hashlib.sha256(self.content.encode()).hexdigest()

    def propagate_from(self, _log):
        """No-op: Note does not propagate logs to related objects."""
        return

    def has_read_access(self, user: CradleUser) -> bool:
        """Return whether the user may view this note.

        Fleeting notes are private to the author and the users they are shared with, admins
        included. Non-fleeting notes with no linked entity entries are restricted to the author
        (legacy rows used to appear world-readable via empty ``has_access_to_entities``).
        """
        if self.fleeting:
            return self.author_id == user.id or self.shares.filter(user=user).exists()

        if user.is_admin:
            return True

        entities = set(self.entries.is_entity())
        if not entities:
            return self.author_id == user.id

        return Access.objects.has_access_to_entities(
            user,
            entities,
            {AccessType.READ, AccessType.READ_WRITE},
        )

    def has_write_access(self, user: CradleUser) -> bool:
        """Return whether the user may edit, upload files to, or delete this note.

        Read-write access to every linked entity grants it, whoever wrote the note; for a fleeting
        note, a read-write share does (deleting, publishing and sharing stay with the author), admins included.
        """
        if self.fleeting:
            return (
                self.author_id == user.id or self.shares.filter(user=user, access_type=AccessType.READ_WRITE).exists()
            )

        if user.is_admin:
            return True

        entities = set(self.entries.is_entity())
        if not entities:
            return self.author_id == user.id

        return Access.objects.has_access_to_entities(user, entities, {AccessType.READ_WRITE})

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


class NoteShare(models.Model):
    """A user the author shared a fleeting note with. Dropped when the note is published."""

    id: models.UUIDField = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False, help_text="Unique identifier."
    )
    note = models.ForeignKey(
        Note, on_delete=models.CASCADE, related_name="shares", help_text="Fleeting note being shared."
    )
    user = models.ForeignKey(
        CradleUser, on_delete=models.CASCADE, related_name="note_shares", help_text="User the note is shared with."
    )
    access_type: models.CharField = models.CharField(
        max_length=20,
        choices=AccessType.choices,
        default=AccessType.READ,
        help_text="Permission level on the note: read or read-write",
    )
    created_at: models.DateTimeField = models.DateTimeField(
        auto_now_add=True, help_text="When the note was shared with the user."
    )

    class Meta:
        constraints = [models.UniqueConstraint(fields=["note", "user"], name="unique_note_share_note_user")]


class ArchivedNote(models.Model):
    """Archived copy of a note, used for history/audit."""

    id: models.UUIDField = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False, help_text="Unique identifier."
    )
    content: models.CharField = models.CharField(help_text="Archived note content.")
    archived_at: models.DateTimeField = models.DateTimeField(help_text="When the note was archived.")


class Snippet(models.Model):
    """Reusable text snippet for note templates. Can be user-owned or system-wide (owner=null)."""

    id: models.UUIDField = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False, help_text="Unique identifier."
    )
    name: models.CharField = models.CharField(max_length=255, help_text="Display name of the snippet.")
    content: models.TextField = models.TextField(help_text="Snippet content (markdown).")
    owner = models.ForeignKey(
        CradleUser,
        related_name="snippets",
        on_delete=models.CASCADE,
        null=True,
        help_text="Owner of the snippet; null for system snippets.",
    )
    created_at: models.DateTimeField = models.DateTimeField(
        auto_now_add=True, help_text="When the snippet was created."
    )

    def __str__(self):
        return self.name
