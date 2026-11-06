"""Serializers for notes, snippets, and file references."""

from typing import Any, Dict, cast

from drf_spectacular.extensions import OpenApiSerializerExtension
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from access.enums import AccessType
from entries.constants import INTERNAL_SUBTYPES
from entries.enums import EntryType
from entries.models import Entry
from entries.serializers import (
    EntryTypesCompressedTreeSerializer,
)
from file_transfer.models import FileReference
from management.settings import system_settings
from user.models import CradleUser
from user.serializers import EssentialUserRetrieveSerializer

from .models import Note, NoteShare, Snippet
from .processor.task_scheduler import TaskScheduler


def _serialize_entities(entries):
    """The entities among ``entries``, as ``OptimizedEntryResponseSerializer`` data (the schema these fields declare)."""
    entities = [entry for entry in entries if entry.entry_class.type == EntryType.ENTITY]
    return OptimizedEntryResponseSerializer(entities, many=True).data


class SnippetSerializer(serializers.ModelSerializer):
    """Serializer for snippet create, read, update."""

    created_by = EssentialUserRetrieveSerializer(
        source="owner", read_only=True, allow_null=True, help_text="Who created the snippet; null for system snippets."
    )
    created_at = serializers.DateTimeField(read_only=True, help_text="When the snippet was created.")

    class Meta:
        model = Snippet
        fields = ["id", "name", "content", "created_by", "created_at"]
        read_only_fields = ["id"]
        extra_kwargs = {
            "name": {"help_text": "Snippet name identifier"},
            "content": {"help_text": "Snippet content (markdown or plain text)"},
        }


class NoteEditSerializer(serializers.ModelSerializer):
    """Serializer for updating note content (triggers processing pipeline)."""

    content = serializers.CharField(
        required=False, allow_blank=True, help_text="Note body (markdown). Triggers processing when updated."
    )
    base_content_hash = serializers.CharField(
        required=False,
        write_only=True,
        help_text="content_hash of the note this edit is based on. "
        "If the note has changed since, the update is rejected with 409.",
    )

    class Meta:
        model = Note
        fields = ["content", "base_content_hash"]

    def update(self, instance: Note, validated_data: dict[str, Any]):
        user = self.context["request"].user
        validated_data.pop("base_content_hash", None)

        if not instance.fleeting:
            content = validated_data.pop("content", None)

            if content is not None:
                TaskScheduler(user, content=content, **validated_data).run_pipeline(instance, allow_invalid=True)
        else:
            content = validated_data.get("content")
            if content is not None:
                instance.content = content
                instance.apply_metadata()
                instance.editor = user

        return super().update(instance, validated_data)


class OptimizedEntryResponseSerializer(serializers.ModelSerializer):
    """Minimal entry representation: id, name, type, subtype, color."""

    type = serializers.CharField(source="entry_class.type", read_only=True)
    subtype = serializers.CharField(source="entry_class.subtype", read_only=True)
    color = serializers.CharField(source="entry_class.color", read_only=True)

    class Meta:
        model = Entry
        fields = ["id", "name", "type", "subtype", "color"]


class FileReferenceBaseSerializer(serializers.ModelSerializer):
    """File metadata under API field names, mapped onto the FileReference columns."""

    name = serializers.CharField(
        source="file_name", read_only=True, allow_null=True, help_text="Original filename for display and download"
    )
    mime_type = serializers.CharField(read_only=True, allow_null=True, help_text="MIME type detected from file content")
    size = serializers.IntegerField(source="file_size", read_only=True, allow_null=True, help_text="File size in bytes")
    md5 = serializers.CharField(
        source="md5_hash", read_only=True, allow_null=True, help_text="MD5 hash of file contents"
    )
    sha1 = serializers.CharField(
        source="sha1_hash", read_only=True, allow_null=True, help_text="SHA-1 hash of file contents"
    )
    sha256 = serializers.CharField(
        source="sha256_hash", read_only=True, allow_null=True, help_text="SHA-256 hash of file contents"
    )
    created_at = serializers.DateTimeField(read_only=True, help_text="When the file was first uploaded")


class FileReferenceWithNoteSerializer(FileReferenceBaseSerializer):
    """File reference with note_id and entities for list views."""

    note_id = serializers.SerializerMethodField(read_only=True)
    entities = OptimizedEntryResponseSerializer(many=True, read_only=True)

    class Meta:
        model = FileReference
        fields = [
            "id",
            "name",
            "mime_type",
            "size",
            "md5",
            "sha1",
            "sha256",
            "note_id",
            "entities",
            "created_at",
        ]

    @extend_schema_field(serializers.UUIDField(allow_null=True))
    def get_note_id(self, obj):
        return obj.note.id if obj.note else None


class FileDetailSerializer(FileReferenceBaseSerializer):
    """File metadata for the file dashboard."""

    class Meta:
        model = FileReference
        fields = [
            "id",
            "name",
            "mime_type",
            "size",
            "md5",
            "sha1",
            "sha256",
            "created_at",
        ]


class FileReferenceListSerializer(serializers.BaseSerializer):
    """Serializer for file reference list operations."""

    def to_representation(self, file_ref):
        """Serialize a single file reference."""
        return {
            "id": str(file_ref.id),
            "name": file_ref.file_name,
            "mime_type": file_ref.mime_type,
            "size": file_ref.file_size,
            "md5": file_ref.md5_hash,
            "sha1": file_ref.sha1_hash,
            "sha256": file_ref.sha256_hash,
            "note_id": str(file_ref.note.id) if file_ref.note else None,
            "entities": self._get_entities_optimized(file_ref),
            "created_at": file_ref.created_at.isoformat(),
        }

    def _get_entities_optimized(self, file_ref):
        """Get entities for the file reference (from its note)."""
        return _serialize_entities(file_ref.note.entries.all()) if file_ref.note else []


class FileReferenceInNoteListSerializer(serializers.Serializer):
    """Schema for file reference in note list responses."""

    id = serializers.UUIDField(help_text="File reference UUID")
    name = serializers.CharField(help_text="Original filename")
    mime_type = serializers.CharField(help_text="MIME type of the file")
    size = serializers.IntegerField(allow_null=True, help_text="File size in bytes")
    md5 = serializers.CharField(allow_null=True, help_text="MD5 hash of file contents")
    sha1 = serializers.CharField(allow_null=True, help_text="SHA-1 hash of file contents")
    sha256 = serializers.CharField(allow_null=True, help_text="SHA-256 hash of file contents")
    note_id = serializers.UUIDField(allow_null=True, help_text="Note UUID the file is attached to")
    entities = OptimizedEntryResponseSerializer(many=True, help_text="Entities linked to this file")
    created_at = serializers.DateTimeField(help_text="When the file was uploaded")


class NoteListResponseSerializer(serializers.Serializer):
    """OpenAPI schema for note list items. Content may be truncated per truncate param."""

    id = serializers.UUIDField(read_only=True, help_text="Note UUID")
    title = serializers.CharField(read_only=True, help_text="Note title")
    description = serializers.CharField(read_only=True, help_text="Note description")
    content = serializers.CharField(read_only=True, help_text="May be truncated based on truncate param")
    fleeting = serializers.BooleanField(read_only=True, help_text="Whether the note is fleeting (quick capture)")
    status = serializers.CharField(read_only=True, help_text="Processing status")
    status_message = serializers.CharField(read_only=True, allow_null=True, help_text="Status message if any")
    status_changed_at = serializers.DateTimeField(read_only=True, allow_null=True, help_text="When status was set")
    metadata = serializers.JSONField(read_only=True, help_text="Extracted metadata from content")
    entities = OptimizedEntryResponseSerializer(many=True, read_only=True, help_text="Entities referenced in the note")
    entry_classes = serializers.ListField(
        child=serializers.CharField(), read_only=True, help_text="Entry class subtypes in the note"
    )
    files = FileReferenceInNoteListSerializer(many=True, read_only=True, help_text="Files attached to the note")
    created_by = EssentialUserRetrieveSerializer(allow_null=True, read_only=True, help_text="Who created the note")
    created_at = serializers.DateTimeField(read_only=True, help_text="When the note was created")
    updated_by = EssentialUserRetrieveSerializer(allow_null=True, read_only=True, help_text="Who last edited the note")
    updated_at = serializers.DateTimeField(read_only=True, allow_null=True, help_text="When the note was last edited")
    linked_at = serializers.DateTimeField(read_only=True, allow_null=True, help_text="When entries were last linked")


class NoteListResponseSerializerExtension(OpenApiSerializerExtension):
    """OpenAPI schema for note list items: a full note, or a restricted note redacted to its id and timestamps."""

    target_class = "notes.serializers.NoteListResponseSerializer"

    def map_serializer(self, auto_schema, direction):
        accessible = super().map_serializer(auto_schema, direction)
        accessible["properties"]["accessible"] = {
            "type": "boolean",
            "enum": [True],
            "description": "The user can access this note.",
        }
        accessible["required"] = [*accessible.get("required", []), "accessible"]

        restricted = {
            "type": "object",
            "description": "Published note the user cannot access that matches the search.",
            "properties": {
                "id": {"type": "string", "format": "uuid"},
                "accessible": {"type": "boolean", "enum": [False]},
                "created_at": {"type": "string", "format": "date-time", "description": "When the note was created"},
                "updated_at": {
                    "type": "string",
                    "format": "date-time",
                    "nullable": True,
                    "description": "When the note was last edited",
                },
            },
            "required": ["id", "accessible", "created_at", "updated_at"],
        }
        return {"oneOf": [accessible, restricted]}


class NoteListSerializer:
    """Serializer for note list operations."""

    def __init__(self, truncate=-1, many=False):
        self.truncate = truncate
        self.many = many

    def to_representation(self, notes_data):
        if self.many:
            return [self._serialize_note(note) for note in notes_data]
        else:
            return self._serialize_note(notes_data)

    def _serialize_note(self, note):
        """Serialize a single note; restricted notes (``is_accessible=False``) keep only their id and timestamps."""
        if getattr(note, "is_accessible", True) is False:
            return {
                "id": str(note.id),
                "accessible": False,
                "created_at": note.created_at.isoformat(),
                "updated_at": note.updated_at.isoformat() if note.updated_at else None,
            }

        entities = _serialize_entities(note.entries.all())

        files_data = []
        for file_ref in note.files.all():
            file_data = {
                "id": str(file_ref.id),
                "name": file_ref.file_name,
                "mime_type": file_ref.mime_type,
                "size": file_ref.file_size,
                "md5": file_ref.md5_hash,
                "sha1": file_ref.sha1_hash,
                "sha256": file_ref.sha256_hash,
                "note_id": str(note.id),
                "entities": entities,
                "created_at": file_ref.created_at.isoformat(),
            }
            files_data.append(file_data)

        return {
            "id": str(note.id),
            "title": note.title,
            "description": note.description,
            "content": self._truncate_content(note),
            "fleeting": note.fleeting,
            "status": note.status,
            "status_message": note.status_message,
            "status_changed_at": note.status_changed_at.isoformat() if note.status_changed_at else None,
            "metadata": note.metadata,
            "entities": entities,
            "entry_classes": list(note.entries.values_list("entry_class__subtype", flat=True).distinct()),
            "files": files_data,
            "created_by": {"id": str(note.author.id), "username": note.author.username} if note.author else None,
            "created_at": note.created_at.isoformat(),
            "updated_by": {"id": str(note.editor.id), "username": note.editor.username} if note.editor else None,
            "updated_at": note.updated_at.isoformat() if note.updated_at else None,
            "linked_at": note.linked_at.isoformat() if note.linked_at else None,
            "accessible": True,
        }

    def _truncate_content(self, note):
        """Truncate content if needed."""
        if note.content_offset >= len(note.content):
            return ""
        if self.truncate == -1 or len(note.content) - note.content_offset <= self.truncate:
            return note.content[note.content_offset :]
        return note.content[note.content_offset : note.content_offset + self.truncate] + "..."

    @property
    def data(self):
        return self.to_representation(self._data)

    def __call__(self, data, **kwargs):
        self._data = data
        return self


class NoteStatusIssueSerializer(serializers.Serializer):
    """A problem link behind an invalid note status."""

    code = serializers.ChoiceField(
        choices=["not_allowed", "unknown_type", "missing_entry", "invalid_value"], help_text="What is wrong."
    )
    key = serializers.CharField(help_text="Entry type of the link.")
    value = serializers.CharField(allow_null=True, help_text="Linked value; null when every link of the type is.")


class NoteRetrieveSerializer(serializers.ModelSerializer):
    """Full note detail with entries, files, creator and last editor."""

    files = FileReferenceWithNoteSerializer(many=True)
    created_by = EssentialUserRetrieveSerializer(
        source="author", read_only=True, allow_null=True, help_text="Who created the note."
    )
    updated_by = EssentialUserRetrieveSerializer(
        source="editor", read_only=True, allow_null=True, help_text="Who last edited the note."
    )
    entry_classes = EntryTypesCompressedTreeSerializer(
        source="entries", exclude=INTERNAL_SUBTYPES, help_text="Entry class subtypes in the note."
    )
    entities = serializers.SerializerMethodField()
    status_issues = NoteStatusIssueSerializer(
        many=True, read_only=True, help_text="Problem links behind an invalid status."
    )
    permission = serializers.SerializerMethodField()
    content_hash = serializers.CharField(
        read_only=True, help_text="SHA-256 of the full content; send as base_content_hash when editing."
    )
    created_at = serializers.DateTimeField(read_only=True, help_text="When the note was created.")
    updated_at = serializers.DateTimeField(read_only=True, allow_null=True, help_text="When the note was last edited.")
    status_changed_at = serializers.DateTimeField(
        read_only=True, allow_null=True, help_text="When the status was last updated."
    )
    linked_at = serializers.DateTimeField(
        read_only=True,
        allow_null=True,
        help_text="When relations were last computed from this note.",
    )

    @extend_schema_field(
        {
            "type": "string",
            "enum": AccessType.values,
            "description": "none: no access; read: view only; read-write: edit, save, upload files to, and delete.",
        }
    )
    def get_permission(self, obj: Note) -> str:
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return AccessType.NONE
        return obj.get_user_permission(cast(CradleUser, request.user))

    @extend_schema_field(OptimizedEntryResponseSerializer(many=True))
    def get_entities(self, obj: Note) -> list:
        return _serialize_entities(obj.entries.all())

    class Meta:
        model = Note
        fields = [
            "id",
            "title",
            "description",
            "content",
            "content_hash",
            "fleeting",
            "status",
            "status_message",
            "status_issues",
            "status_changed_at",
            "metadata",
            "entities",
            "entry_classes",
            "files",
            "permission",
            "created_by",
            "created_at",
            "updated_by",
            "updated_at",
            "linked_at",
        ]

    def __init__(self, *args, truncate=-1, **kwargs) -> None:
        self.truncate = truncate
        super().__init__(*args, **kwargs)

    def to_representation(self, obj: Any) -> Dict[str, Any]:
        """Serialize note; truncate content if truncate param is set and content exceeds it."""
        data = super().to_representation(obj)
        content = data["content"]

        if self.truncate == -1 or len(content) - obj.content_offset <= self.truncate:
            return data

        data["content"] = content[obj.content_offset : obj.content_offset + self.truncate] + "..."
        return data


class FleetingNoteSerializer(serializers.ModelSerializer):
    """Serializer for fleeting notes; bypasses processing pipeline for quick note taking."""

    content = serializers.CharField(
        required=False, allow_blank=True, help_text="Note body. Uses default template if empty."
    )
    created_at = serializers.DateTimeField(read_only=True, help_text="When the note was created.")

    class Meta:
        model = Note
        fields = [
            "id",
            "title",
            "description",
            "content",
            "created_at",
        ]
        read_only_fields = ["id"]

    def create(self, validated_data):
        request = self.context.get("request")
        user = cast(CradleUser, request.user)

        validated_data["fleeting"] = True
        validated_data["author"] = user
        validated_data["editor"] = user

        content = validated_data.get("content")
        if not content:
            validated_data["content"] = user.default_note_template or system_settings.notes.default_note_template

        note = Note(**validated_data)
        title, description = note.title, note.description
        note.apply_metadata()
        if title:
            note.title, note.description = title, description
        note.save(force_insert=True)
        return note

    def update(self, instance, validated_data):
        request = self.context.get("request")
        user = cast(CradleUser, request.user)

        instance.content = validated_data.get("content", instance.content)
        instance.title = validated_data.get("title", instance.title)
        instance.description = validated_data.get("description", instance.description)
        instance.editor = user
        instance.fleeting = True

        if not instance.title:
            instance.apply_metadata()

        instance.save()
        return instance


class NoteShareSerializer(serializers.ModelSerializer):
    """A user a fleeting note is shared with."""

    user = EssentialUserRetrieveSerializer(help_text="User the note is shared with")

    class Meta:
        model = NoteShare
        fields = ["user", "access_type", "created_at"]


class NoteShareUpdateSerializer(serializers.Serializer):
    """Request body for sharing a fleeting note with a user; ``none`` stops sharing it."""

    access_type = serializers.ChoiceField(
        choices=AccessType.choices, help_text="Access to give the user: none (stop sharing), read or read-write"
    )


class NoteShareCandidateSerializer(serializers.ModelSerializer):
    """A user a fleeting note can be shared with."""

    class Meta:
        model = CradleUser
        fields = ["id", "username"]
