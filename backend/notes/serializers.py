from typing import Any, Dict, cast

from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from cradle import settings
from entries.enums import EntryType
from entries.models import Entry, EntryClass
from entries.serializers import (
    EntryResponseSerializer,
    EntryTypesCompressedTreeSerializer,
)
from file_transfer.models import FileReference
from file_transfer.serializers import FileReferenceSerializer
from management.settings import cradle_settings
from user.models import CradleUser
from user.serializers import EssentialUserRetrieveSerializer, UserRetrieveSerializer

from .exceptions import (
    InvalidRequestException,
    NoteDoesNotExistException,
    NoteIsEmptyException,
)
from .markdown.to_metadata import infer_metadata
from .models import Note, Snippet
from .processor.task_scheduler import TaskScheduler


class SnippetSerializer(serializers.ModelSerializer):
    owner = UserRetrieveSerializer(read_only=True)

    class Meta:
        model = Snippet
        fields = ["id", "owner", "name", "content", "created_on"]
        read_only_fields = ["id", "created_on"]


class NoteCreateSerializer(serializers.ModelSerializer):
    content = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = Note
        fields = ["content"]

    def validate(self, data):
        """First checks whether the client sent the content of the field
        and that it is non-empty. Then, it calls the TaskScheduler to perform
        all of the validations required for creating a note.

        Args:
            data: a dictionary containing the attributes of
                the Note entry

        Returns:
            True iff the validations pass.

        Raises:
            NoteIsEmptyException: if the client did not sent the content
            of the note or if the content is empty.
            NotEnoughReferencesException: if the note does not reference at
            least one entity and at least two entries.
            EntriesDoNotExistException: if the note references entities
            that do not exist.
            NoAccessToEntriesException: if the user does not have access to the
            referenced entities.
        """
        if "content" not in data or not data["content"]:
            raise NoteIsEmptyException()

        self.content = data["content"]

        return super().validate(data)

    def create(self, validated_data):
        """Creates a new Note entry based on the validated data.

        Args:
            validated_data: a dictionary containing the attributes of
                the Note entry

        Returns:
            The created Note entry
        """
        user = self.context["request"].user
        note = TaskScheduler(user, **validated_data).run_pipeline()
        return note


class NoteEditSerializer(serializers.ModelSerializer):
    content = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = Note
        fields = ["content"]

    def update(self, instance: Note, validated_data: dict[str, Any]):
        user = self.context["request"].user

        if not instance.fleeting:
            content = validated_data.pop("content", None)

            if content is not None:
                TaskScheduler(user, content=content, **validated_data).run_pipeline(
                    instance
                )

        return super().update(instance, validated_data)


class LinkedEntryClassSerializer(serializers.ModelSerializer):
    class Meta:
        model = EntryClass
        fields = ["type", "subtype"]


class LinkedEntrySerializer(serializers.ModelSerializer):
    entry_class = LinkedEntryClassSerializer(read_only=True)

    class Meta:
        model = Entry
        fields = ["name", "entry_class"]

    def to_representation(self, instance):
        """Move fields from profile to user representation."""
        representation = super().to_representation(instance)
        entry_class_repr = representation.pop("entry_class")

        for key in entry_class_repr:
            representation[key] = entry_class_repr[key]

        return representation

    def to_internal_value(self, data):
        """Move fields related to profile to their own profile dictionary."""
        entry_class_internal = {}
        for key in LinkedEntryClassSerializer.Meta.fields:
            if key in data:
                entry_class_internal[key] = data.pop(key)

        internal = super().to_internal_value(data)
        internal["entry_class"] = entry_class_internal
        return internal


class OptimizedEntryResponseSerializer(serializers.ModelSerializer):
    type = serializers.CharField(source="entry_class.type", read_only=True)
    subtype = serializers.CharField(source="entry_class.subtype", read_only=True)
    color = serializers.CharField(source="entry_class.color", read_only=True)

    class Meta:
        model = Entry
        fields = ["id", "name", "type", "subtype", "color"]


class FileReferenceWithNoteSerializer(serializers.ModelSerializer):
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


class FileReferenceListSerializer:
    """
    Serializer for file reference list operations.
    """

    def __init__(self, files_data=None, many=False):
        self.many = many
        self._data = files_data

    def to_representation(self, files_data=None):
        data_source = files_data if files_data is not None else self._data
        if self.many:
            return [self._serialize_file(file_ref) for file_ref in data_source]
        else:
            return self._serialize_file(data_source)

    def _serialize_file(self, file_ref):
        """Serialize a single file reference"""
        data = {
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
        return data

    def _get_entities_optimized(self, file_ref):
        """Get entities for the file reference"""
        entities = []
        if file_ref.note:
            for entry in file_ref.note.entries.all():
                if (
                    hasattr(entry, "entry_class")
                    and entry.entry_class
                    and entry.entry_class.type == "entity"
                ):
                    entities.append(
                        {
                            "id": str(entry.id),
                            "name": entry.name,
                            "type": entry.entry_class.type,
                            "subtype": entry.entry_class.subtype,
                            "color": entry.entry_class.color,
                        }
                    )
        return entities


class NoteListSerializer:
    """
    Serializer for note list operations.
    """

    def __init__(self, truncate=-1, many=False):
        self.truncate = truncate
        self.many = many

    def to_representation(self, notes_data):
        if self.many:
            return [self._serialize_note(note) for note in notes_data]
        else:
            return self._serialize_note(notes_data)

    def _serialize_note(self, note):
        """Serialize a single note"""
        data = {
            "id": str(note.id),
            "fleeting": note.fleeting,
            "status": note.status,
            "status_message": note.status_message,
            "status_timestamp": note.status_timestamp.isoformat()
            if note.status_timestamp
            else None,
            "content": self._truncate_content(note),
            "title": note.title,
            "description": note.description,
            "metadata": note.metadata,
            "timestamp": note.timestamp.isoformat(),
            "edit_timestamp": note.edit_timestamp.isoformat()
            if note.edit_timestamp
            else None,
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

        entities = note.entries.filter(entry_class__type=EntryType.ENTITY)
        data["entities"] = [
            {
                "id": str(entity.id),
                "name": entity.name,
                "type": entity.entry_class.type,
                "subtype": entity.entry_class.subtype,
                "color": entity.entry_class.color,
            }
            for entity in entities
        ]

        data["entry_classes"] = set(
            note.entries.values_list("entry_class__subtype", flat=True)
        )

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
                "entities": self._get_file_entities(file_ref, note),
            }
            files_data.append(file_data)
        data["files"] = files_data

        return data

    def _truncate_content(self, note):
        """Truncate content if needed"""
        if note.content_offset >= len(note.content):
            return ""
        if (
            self.truncate == -1
            or len(note.content) - note.content_offset <= self.truncate
        ):
            return note.content[note.content_offset :]
        return (
            note.content[note.content_offset : note.content_offset + self.truncate]
            + "..."
        )

    def _get_file_entities(self, file_ref, note):
        """Get entities for file reference"""
        entities = []
        for entry in note.entries.all():
            if (
                hasattr(entry, "entry_class")
                and entry.entry_class
                and entry.entry_class.type == "entity"
            ):
                entities.append(
                    {
                        "id": str(entry.id),
                        "name": entry.name,
                        "type": entry.entry_class.type,
                        "subtype": entry.entry_class.subtype,
                        "color": entry.entry_class.color,
                    }
                )
        return entities

    @property
    def data(self):
        return self.to_representation(self._data)

    def __call__(self, data, **kwargs):
        self._data = data
        return self


class NoteRetrieveSerializer(serializers.ModelSerializer):
    files = FileReferenceWithNoteSerializer(many=True)
    author = EssentialUserRetrieveSerializer()
    editor = EssentialUserRetrieveSerializer()
    entries = EntryTypesCompressedTreeSerializer(exclude=settings.INTERNAL_SUBTYPES)
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
        """When the note is serialized if it contains more than 200 characters
        the content is truncated to 200 characters and "..." is appended to the end.

        Args:
            obj (Any): The note object.

        Returns:
            Dict[str, Any]: The serialized note object.
        """
        entities = obj.entries.filter(entry_class__type=EntryType.ENTITY)
        print(entities)
        data = super().to_representation(obj)

        data["entry_classes"] = data.pop("entries")
        data["entities"] = [
            {
                "id": str(entity.id),
                "name": entity.name,
                "type": entity.entry_class.type,
                "subtype": entity.entry_class.subtype,
                "color": entity.entry_class.color,
            }
            for entity in entities
        ]
        content = data["content"]

        if self.truncate == -1 or len(content) - obj.content_offset <= self.truncate:
            return data

        # Optimize string operations for truncation
        if len(content) > self.truncate:
            data["content"] = (
                content[obj.content_offset : obj.content_offset + self.truncate] + "..."
            )

        return data


class NoteReportSerializer(serializers.ModelSerializer):
    files = FileReferenceSerializer(many=True)

    class Meta:
        model = Note
        fields = ["content", "timestamp", "files"]


class ReportQuerySerializer(serializers.Serializer):
    note_ids = serializers.ListField(child=serializers.UUIDField(), allow_empty=False)

    def __check_unique(self, value) -> None:
        if len(set(value)) != len(value):
            raise InvalidRequestException("The note ids should be unique.")

    def __check_exists(self, notes, value) -> None:
        if notes.count() != len(value):
            raise NoteDoesNotExistException("One of the provided notes does not exist.")

    def validate_note_ids(self, value: Any) -> Any:
        """Validates a list of note IDs.

        This method checks the following:
        1. Ensures the note IDs are unique.
        2. Checks if the notes exist in the database.

        Args:
            value (Any): The value to be validated, expected to be a list of note IDs.

        Returns:
            Any: The validated value, which is the list of note IDs.

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
            data (Any): The input data to be validated.

        Returns:
            Any: The validated data.

        Raises:
            InvalidRequestException: If the `note_ids` field is None.
        """
        if data["note_ids"] is None:
            raise InvalidRequestException()

        return super().validate(data)


class ReportSerializer(serializers.Serializer):
    entities = EntryResponseSerializer(many=True)
    artifacts = EntryResponseSerializer(many=True)
    notes = NoteReportSerializer(many=True)


class FleetingNoteSerializer(serializers.ModelSerializer):
    """
    Serializer for fleeting notes. This bypasses the normal note processing pipeline
    and is used for quick note taking without entity references.
    """

    content = serializers.CharField(required=False, allow_blank=True)

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
            validated_data["content"] = (
                user.default_note_template
                or cradle_settings.notes.default_note_template
            )

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


class FleetingNoteRetrieveSerializer(serializers.ModelSerializer):
    """
    Serializer for retrieving fleeting notes with optional content truncation.
    """

    files = FileReferenceSerializer(many=True, read_only=True)

    class Meta:
        model = Note
        fields = ["id", "content", "timestamp", "files"]
        read_only_fields = fields

    def __init__(self, *args, **kwargs):
        # Allow truncation of content for preview
        self.truncate = kwargs.pop("truncate", None)
        super().__init__(*args, **kwargs)

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        if self.truncate and len(ret["content"]) > self.truncate:
            ret["content"] = ret["content"][: self.truncate] + "..."
        return ret
