"""Serializers for notes, snippets, and file references."""

from typing import Any, Dict, cast

from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from core.exceptions import InvalidRequestException
from cradle.settings_common import INTERNAL_SUBTYPES
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

from .exceptions import NoteDoesNotExistException
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

    class Meta:
        model = Snippet
        fields = ["id", "owner", "name", "content", "created_on"]
        read_only_fields = ["id", "created_on"]
        extra_kwargs = {
            "name": {"help_text": "Snippet name identifier"},
            "content": {"help_text": "Snippet content (markdown or plain text)"},
        }


class NoteEditSerializer(serializers.ModelSerializer):
    """Serializer for updating note content (triggers processing pipeline)."""

    content = serializers.CharField(
        required=False, allow_blank=True, help_text="Note body (markdown). Triggers processing when updated."
    )

    class Meta:
        model = Note
        fields = ["content"]

    def update(self, instance: Note, validated_data: dict[str, Any]):
        user = self.context["request"].user

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


class FileReferenceWithNoteSerializer(serializers.ModelSerializer):
    """File reference with note_id and entities for list views."""

    note_id = serializers.SerializerMethodField(read_only=True)
    entities = OptimizedEntryResponseSerializer(many=True, read_only=True)

    class Meta:
        model = FileReference
        fields = [
            "id",
            "mimetype",
            "entities",
            "file_size",
            "file_name",
            "timestamp",
            "note_id",
            "md5_hash",
            "sha1_hash",
            "sha256_hash",
        ]

    @extend_schema_field(serializers.UUIDField(allow_null=True))
    def get_note_id(self, obj):
        return obj.note.id if obj.note else None


class FileReferenceListSerializer(serializers.BaseSerializer):
    """Serializer for file reference list operations."""

    def to_representation(self, file_ref):
        """Serialize a single file reference."""
        return {
            "id": str(file_ref.id),
            "mimetype": file_ref.mimetype,
            "file_name": file_ref.file_name,
            "timestamp": file_ref.timestamp.isoformat(),
            "note_id": str(file_ref.note.id) if file_ref.note else None,
            "md5_hash": file_ref.md5_hash,
            "sha1_hash": file_ref.sha1_hash,
            "sha256_hash": file_ref.sha256_hash,
            "file_size": file_ref.file_size,
            "entities": self._get_entities_optimized(file_ref),
        }

    def _get_entities_optimized(self, file_ref):
        """Get entities for the file reference (from its note)."""
        return _serialize_entities(file_ref.note.entries.all()) if file_ref.note else []


class FileReferenceInNoteListSerializer(serializers.Serializer):
    """Schema for file reference in note list responses."""

    id = serializers.UUIDField(help_text="File reference UUID")
    minio_file_name = serializers.CharField(help_text="Storage object key")
    mimetype = serializers.CharField(help_text="MIME type of the file")
    file_name = serializers.CharField(help_text="Original filename")
    bucket_name = serializers.CharField(help_text="S3 bucket name")
    timestamp = serializers.DateTimeField(help_text="When the file was uploaded")
    note_id = serializers.UUIDField(allow_null=True, help_text="Note UUID the file is attached to")
    md5_hash = serializers.CharField(allow_null=True, help_text="MD5 hash of file contents")
    sha1_hash = serializers.CharField(allow_null=True, help_text="SHA-1 hash of file contents")
    sha256_hash = serializers.CharField(allow_null=True, help_text="SHA-256 hash of file contents")
    entities = OptimizedEntryResponseSerializer(many=True, help_text="Entities linked to this file")


class NoteListResponseSerializer(serializers.Serializer):
    """OpenAPI schema for note list items. Content may be truncated per truncate param."""

    id = serializers.UUIDField(read_only=True, help_text="Note UUID")
    fleeting = serializers.BooleanField(read_only=True, help_text="Whether the note is fleeting (quick capture)")
    status = serializers.CharField(read_only=True, help_text="Processing status")
    status_message = serializers.CharField(read_only=True, allow_null=True, help_text="Status message if any")
    status_timestamp = serializers.DateTimeField(read_only=True, allow_null=True, help_text="When status was set")
    content = serializers.CharField(read_only=True, help_text="May be truncated based on truncate param")
    title = serializers.CharField(read_only=True, help_text="Note title")
    description = serializers.CharField(read_only=True, help_text="Note description")
    metadata = serializers.JSONField(read_only=True, help_text="Extracted metadata from content")
    timestamp = serializers.DateTimeField(read_only=True, help_text="When the note was created")
    edit_timestamp = serializers.DateTimeField(
        read_only=True, allow_null=True, help_text="When the note was last edited"
    )
    last_linked = serializers.DateTimeField(read_only=True, allow_null=True, help_text="When entries were last linked")
    author = EssentialUserRetrieveSerializer(allow_null=True, read_only=True, help_text="Note author")
    editor = EssentialUserRetrieveSerializer(allow_null=True, read_only=True, help_text="Last editor")
    entities = OptimizedEntryResponseSerializer(many=True, read_only=True, help_text="Entities referenced in the note")
    entry_classes = serializers.ListField(
        child=serializers.CharField(), read_only=True, help_text="Entry class subtypes in the note"
    )
    files = FileReferenceInNoteListSerializer(many=True, read_only=True, help_text="Files attached to the note")


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
        """Serialize a single note."""
        data = {
            "id": str(note.id),
            "fleeting": note.fleeting,
            "status": note.status,
            "status_message": note.status_message,
            "status_timestamp": note.status_timestamp.isoformat() if note.status_timestamp else None,
            "content": self._truncate_content(note),
            "title": note.title,
            "description": note.description,
            "metadata": note.metadata,
            "timestamp": note.timestamp.isoformat(),
            "edit_timestamp": note.edit_timestamp.isoformat() if note.edit_timestamp else None,
            "last_linked": note.last_linked.isoformat() if note.last_linked else None,
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
                "minio_file_name": file_ref.minio_file_name,
                "mimetype": file_ref.mimetype,
                "file_name": file_ref.file_name,
                "bucket_name": file_ref.bucket_name,
                "timestamp": file_ref.timestamp.isoformat(),
                "note_id": str(note.id),
                "md5_hash": file_ref.md5_hash,
                "sha1_hash": file_ref.sha1_hash,
                "sha256_hash": file_ref.sha256_hash,
                "entities": _serialize_entities(note.entries.all()),
            }
            files_data.append(file_data)
        data["files"] = files_data

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

    class Meta:
        model = Note
        fields = [
            "id",
            "entities",
            "fleeting",
            "status",
            "status_message",
            "status_timestamp",
            "content",
            "title",
            "description",
            "metadata",
            "timestamp",
            "author",
            "entries",
            "edit_timestamp",
            "editor",
            "last_linked",
            "files",
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


class ReportQuerySerializer(serializers.Serializer):
    """Query params for report generation: list of note IDs."""

    note_ids = serializers.ListField(
        child=serializers.UUIDField(),
        allow_empty=False,
        help_text="List of note UUIDs to include in the report.",
    )

    def __check_unique(self, value) -> None:
        if len(set(value)) != len(value):
            raise InvalidRequestException(detail="The note ids should be unique.")

    def __check_exists(self, notes, value) -> None:
        if notes.count() != len(value):
            raise NoteDoesNotExistException(detail="One of the provided notes does not exist.")

    def validate_note_ids(self, value: Any) -> Any:
        """Validates a list of note IDs.

        This method checks the following:
        1. Ensures the note IDs are unique.
        2. Checks if the notes exist in the database.

        Args:
            value: List of note IDs to validate.

        Returns:
            The validated list of note IDs.

        Raises:
            InvalidRequestException: If the note IDs are not unique.
            NoteDoesNotExistException: If one of the requested notes does not exist.
        """
        required_notes = Note.objects.filter(id__in=value)
        self.__check_unique(value)
        self.__check_exists(required_notes, value)
        return value

    def validate(self, data: Any) -> Any:
        """Validates the input data.

        This method checks if the `note_ids` field in the input data is not None
        and calls the superclass's validate method for further validation.

        Args:
            data: Input data to validate.

        Returns:
            The validated data.

        Raises:
            InvalidRequestException: If the `note_ids` field is None.
        """
        if data["note_ids"] is None:
            raise InvalidRequestException(detail="note_ids field is required.")

        return super().validate(data)


class FleetingNoteSerializer(serializers.ModelSerializer):
    """Serializer for fleeting notes; bypasses processing pipeline for quick note taking."""

    content = serializers.CharField(
        required=False, allow_blank=True, help_text="Note body. Uses default template if empty."
    )

    class Meta:
        model = Note
        fields = [
            "id",
            "content",
            "timestamp",
            "title",
            "description",
            "fleeting",
        ]
        read_only_fields = ["id", "timestamp", "fleeting"]

    def create(self, validated_data):
        request = self.context.get("request")
        user = cast(CradleUser, request.user)

        # Always create as fleeting note
        validated_data["fleeting"] = True
        validated_data["author"] = user
        validated_data["editor"] = user

        content = validated_data.get("content")
        if not content:
            validated_data["content"] = user.default_note_template or cradle_settings.notes.default_note_template

        # Extract title and description from content if not provided
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

        # Update basic fields
        instance.content = validated_data.get("content", instance.content)
        instance.title = validated_data.get("title", instance.title)
        instance.description = validated_data.get("description", instance.description)
        instance.editor = user
        instance.fleeting = True

        # Extract title and description from content if not provided
        content = instance.content
        if not instance.title:
            offset, metadata = infer_metadata(content)
            instance.title = metadata.get("title", "")
            instance.description = metadata.get("description", "")
            instance.metadata = metadata
            instance.content_offset = offset

        instance.save()
        return instance
