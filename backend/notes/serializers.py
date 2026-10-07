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
from file_transfer.serializers import FileReferenceSerializer
from management.settings import cradle_settings
from user.models import CradleUser
from user.serializers import EssentialUserRetrieveSerializer, UserRetrieveSerializer

from .markdown.to_metadata import infer_metadata
from .models import Note, Snippet
from .processor.task_scheduler import TaskScheduler


def _serialize_entities(entries):
    """Serialize entity entries to minimal dict (id, name, type, subtype, color)."""
    result = []
    for entry in entries:
        if hasattr(entry, "entry_class") and entry.entry_class and entry.entry_class.type == EntryType.ENTITY:
            result.append(
                {
                    "id": str(entry.id),
                    "name": entry.name,
                    "type": entry.entry_class.type,
                    "subtype": entry.entry_class.subtype,
                    "color": entry.entry_class.color,
                }
            )
    return result


class SnippetSerializer(serializers.ModelSerializer):
    """Serializer for snippet create, read, update."""

    owner = UserRetrieveSerializer(read_only=True)
    created_at = serializers.DateTimeField(
        source="created_on", read_only=True, help_text="When the snippet was created."
    )

    class Meta:
        model = Snippet
        fields = ["id", "owner", "name", "content", "created_at"]
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
                TaskScheduler(user, content=content, **validated_data).run_pipeline(instance)
        else:
            content = validated_data.get("content")
            if content is not None:
                offset, metadata = infer_metadata(content)
                instance.title = metadata.get("title", "")
                instance.description = metadata.get("description", "")
                instance.metadata = metadata
                instance.content_offset = offset
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
    size = serializers.IntegerField(source="file_size", read_only=True, allow_null=True, help_text="File size in bytes")
    mime_type = serializers.CharField(
        source="mimetype", read_only=True, allow_null=True, help_text="MIME type detected from file content"
    )
    md5 = serializers.CharField(
        source="md5_hash", read_only=True, allow_null=True, help_text="MD5 hash of file contents"
    )
    sha1 = serializers.CharField(
        source="sha1_hash", read_only=True, allow_null=True, help_text="SHA-1 hash of file contents"
    )
    sha256 = serializers.CharField(
        source="sha256_hash", read_only=True, allow_null=True, help_text="SHA-256 hash of file contents"
    )
    created_at = serializers.DateTimeField(
        source="timestamp", read_only=True, help_text="When the file was first uploaded"
    )


class FileReferenceWithNoteSerializer(FileReferenceBaseSerializer):
    """File reference with note_id and entities for list views."""

    note_id = serializers.SerializerMethodField(read_only=True)
    entities = OptimizedEntryResponseSerializer(many=True, read_only=True)

    class Meta:
        model = FileReference
        fields = [
            "id",
            "mime_type",
            "entities",
            "size",
            "name",
            "created_at",
            "note_id",
            "md5",
            "sha1",
            "sha256",
        ]

    @extend_schema_field(serializers.UUIDField(allow_null=True))
    def get_note_id(self, obj):
        return obj.note.id if obj.note else None


class FileDetailSerializer(FileReferenceBaseSerializer):
    """File metadata plus the entries linked through the accessible notes holding it or a copy of it."""

    entries = OptimizedEntryResponseSerializer(many=True, read_only=True, source="linked_entries")

    class Meta:
        model = FileReference
        fields = [
            "id",
            "mime_type",
            "size",
            "name",
            "created_at",
            "md5",
            "sha1",
            "sha256",
            "entries",
        ]


class FileReferenceListSerializer(serializers.BaseSerializer):
    """Serializer for file reference list operations."""

    def to_representation(self, file_ref):
        """Serialize a single file reference."""
        return {
            "id": str(file_ref.id),
            "mime_type": file_ref.mimetype,
            "name": file_ref.file_name,
            "created_at": file_ref.timestamp.isoformat(),
            "note_id": str(file_ref.note.id) if file_ref.note else None,
            "md5": file_ref.md5_hash,
            "sha1": file_ref.sha1_hash,
            "sha256": file_ref.sha256_hash,
            "size": file_ref.file_size,
            "entities": self._get_entities_optimized(file_ref),
        }

    def _get_entities_optimized(self, file_ref):
        """Get entities for the file reference (from its note)."""
        return _serialize_entities(file_ref.note.entries.all()) if file_ref.note else []


class FileReferenceInNoteListSerializer(serializers.Serializer):
    """Schema for file reference in note list responses."""

    id = serializers.UUIDField(help_text="File reference UUID")
    mime_type = serializers.CharField(help_text="MIME type of the file")
    name = serializers.CharField(help_text="Original filename")
    created_at = serializers.DateTimeField(help_text="When the file was uploaded")
    note_id = serializers.UUIDField(allow_null=True, help_text="Note UUID the file is attached to")
    md5 = serializers.CharField(allow_null=True, help_text="MD5 hash of file contents")
    sha1 = serializers.CharField(allow_null=True, help_text="SHA-1 hash of file contents")
    sha256 = serializers.CharField(allow_null=True, help_text="SHA-256 hash of file contents")
    entities = OptimizedEntryResponseSerializer(many=True, help_text="Entities linked to this file")


class NoteListResponseSerializer(serializers.Serializer):
    """OpenAPI schema for note list items. Content may be truncated per truncate param."""

    id = serializers.UUIDField(read_only=True, help_text="Note UUID")
    fleeting = serializers.BooleanField(read_only=True, help_text="Whether the note is fleeting (quick capture)")
    status = serializers.CharField(read_only=True, help_text="Processing status")
    status_message = serializers.CharField(read_only=True, allow_null=True, help_text="Status message if any")
    status_changed_at = serializers.DateTimeField(read_only=True, allow_null=True, help_text="When status was set")
    content = serializers.CharField(read_only=True, help_text="May be truncated based on truncate param")
    title = serializers.CharField(read_only=True, help_text="Note title")
    description = serializers.CharField(read_only=True, help_text="Note description")
    metadata = serializers.JSONField(read_only=True, help_text="Extracted metadata from content")
    created_at = serializers.DateTimeField(read_only=True, help_text="When the note was created")
    updated_at = serializers.DateTimeField(read_only=True, allow_null=True, help_text="When the note was last edited")
    linked_at = serializers.DateTimeField(read_only=True, allow_null=True, help_text="When entries were last linked")
    author = EssentialUserRetrieveSerializer(allow_null=True, read_only=True, help_text="Note author")
    editor = EssentialUserRetrieveSerializer(allow_null=True, read_only=True, help_text="Last editor")
    entities = OptimizedEntryResponseSerializer(many=True, read_only=True, help_text="Entities referenced in the note")
    entry_classes = serializers.ListField(
        child=serializers.CharField(), read_only=True, help_text="Entry class subtypes in the note"
    )
    files = FileReferenceInNoteListSerializer(many=True, read_only=True, help_text="Files attached to the note")


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
                "created_at": note.timestamp.isoformat(),
                "updated_at": note.edit_timestamp.isoformat() if note.edit_timestamp else None,
            }

        data = {
            "id": str(note.id),
            "fleeting": note.fleeting,
            "status": note.status,
            "status_message": note.status_message,
            "status_changed_at": note.status_timestamp.isoformat() if note.status_timestamp else None,
            "content": self._truncate_content(note),
            "title": note.title,
            "description": note.description,
            "metadata": note.metadata,
            "created_at": note.timestamp.isoformat(),
            "updated_at": note.edit_timestamp.isoformat() if note.edit_timestamp else None,
            "linked_at": note.last_linked.isoformat() if note.last_linked else None,
        }

        if note.author:
            data["author"] = {
                "id": str(note.author.id),
                "username": note.author.username,
            }
        else:
            data["author"] = None

        if note.editor:
            data["editor"] = {
                "id": str(note.editor.id),
                "username": note.editor.username,
            }
        else:
            data["editor"] = None

        data["entities"] = _serialize_entities(note.entries.all())

        data["entry_classes"] = list(note.entries.values_list("entry_class__subtype", flat=True).distinct())

        files_data = []
        for file_ref in note.files.all():
            file_data = {
                "id": str(file_ref.id),
                "mime_type": file_ref.mimetype,
                "name": file_ref.file_name,
                "created_at": file_ref.timestamp.isoformat(),
                "note_id": str(note.id),
                "md5": file_ref.md5_hash,
                "sha1": file_ref.sha1_hash,
                "sha256": file_ref.sha256_hash,
                "entities": _serialize_entities(note.entries.all()),
            }
            files_data.append(file_data)
        data["files"] = files_data
        data["accessible"] = True

        return data

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


class NoteRetrieveSerializer(serializers.ModelSerializer):
    """Full note detail with entries, files, author, editor."""

    files = FileReferenceWithNoteSerializer(many=True)
    author = EssentialUserRetrieveSerializer()
    editor = EssentialUserRetrieveSerializer()
    entries = EntryTypesCompressedTreeSerializer(exclude=INTERNAL_SUBTYPES)
    entities = OptimizedEntryResponseSerializer(many=True, read_only=True)
    permission = serializers.SerializerMethodField()
    content_hash = serializers.CharField(
        read_only=True, help_text="SHA-256 of the full content; send as base_content_hash when editing."
    )
    created_at = serializers.DateTimeField(source="timestamp", read_only=True, help_text="When the note was created.")
    updated_at = serializers.DateTimeField(
        source="edit_timestamp", read_only=True, allow_null=True, help_text="When the note was last edited."
    )
    status_changed_at = serializers.DateTimeField(
        source="status_timestamp", read_only=True, allow_null=True, help_text="When the status was last updated."
    )
    linked_at = serializers.DateTimeField(
        source="last_linked",
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

    class Meta:
        model = Note
        fields = [
            "id",
            "entities",
            "fleeting",
            "status",
            "status_message",
            "status_changed_at",
            "content",
            "title",
            "description",
            "metadata",
            "created_at",
            "author",
            "entries",
            "updated_at",
            "editor",
            "linked_at",
            "files",
            "permission",
            "content_hash",
        ]

    def __init__(self, *args, truncate=-1, **kwargs) -> None:
        self.truncate = truncate
        super().__init__(*args, **kwargs)

    def to_representation(self, obj: Any) -> Dict[str, Any]:
        """Serialize note; truncate content if truncate param is set and content exceeds it."""
        data = super().to_representation(obj)
        data["entry_classes"] = data.pop("entries")
        data["entities"] = _serialize_entities(obj.entries.all())
        content = data["content"]

        if self.truncate == -1 or len(content) - obj.content_offset <= self.truncate:
            return data

        data["content"] = content[obj.content_offset : obj.content_offset + self.truncate] + "..."
        return data


class NoteReportSerializer(serializers.ModelSerializer):
    """Serializer for note content in reports."""

    files = FileReferenceSerializer(many=True)

    class Meta:
        model = Note
        fields = ["content", "timestamp", "files"]


class FleetingNoteSerializer(serializers.ModelSerializer):
    """Serializer for fleeting notes; bypasses processing pipeline for quick note taking."""

    content = serializers.CharField(
        required=False, allow_blank=True, help_text="Note body. Uses default template if empty."
    )
    created_at = serializers.DateTimeField(source="timestamp", read_only=True, help_text="When the note was created.")

    class Meta:
        model = Note
        fields = [
            "id",
            "content",
            "created_at",
            "title",
            "description",
            "fleeting",
        ]
        read_only_fields = ["id", "fleeting"]

    def create(self, validated_data):
        request = self.context.get("request")
        user = cast(CradleUser, request.user)

        validated_data["fleeting"] = True
        validated_data["author"] = user
        validated_data["editor"] = user

        content = validated_data.get("content")
        if not content:
            validated_data["content"] = user.default_note_template or cradle_settings.notes.default_note_template

        content = validated_data.get("content", "")
        if not validated_data.get("title"):
            offset, metadata = infer_metadata(content)
            validated_data["title"] = metadata.get("title", "")
            validated_data["description"] = metadata.get("description", "")
            validated_data["metadata"] = metadata
            validated_data["content_offset"] = offset

        note = Note.objects.create(**validated_data)
        return note

    def update(self, instance, validated_data):
        request = self.context.get("request")
        user = cast(CradleUser, request.user)

        instance.content = validated_data.get("content", instance.content)
        instance.title = validated_data.get("title", instance.title)
        instance.description = validated_data.get("description", instance.description)
        instance.editor = user
        instance.fleeting = True

        content = instance.content
        if not instance.title:
            offset, metadata = infer_metadata(content)
            instance.title = metadata.get("title", "")
            instance.description = metadata.get("description", "")
            instance.metadata = metadata
            instance.content_offset = offset

        instance.save()
        return instance
