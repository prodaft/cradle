from typing import Any, Dict, cast

from drf_spectacular.utils import extend_schema_field
from entries.models import Entry, EntryClass
from entries.serializers import (
    EntryResponseSerializer,
    EntryTypesCompressedTreeSerializer,
)
from file_transfer.models import FileReference
from file_transfer.serializers import FileReferenceSerializer
from rest_framework import serializers
from user.models import CradleUser
from user.serializers import EssentialUserRetrieveSerializer, UserRetrieveSerializer

from .exceptions import (
    InvalidRequestException,
    NoteDoesNotExistException,
    NoteIsEmptyException,
    NoteNotPublishableException,
)
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
    files = FileReferenceSerializer(required=False, many=True)

    class Meta:
        model = Note
        fields = ["publishable", "content", "files"]

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
        Moreover, it sets the entries field to correspond to the
        referenced_entries field which was persisted in the validate
        method. Additionally, it sets the files field to
        correspond to the file references that are linked to the note.

        Args:
            validated_data: a dictionary containing the attributes of
                the Note entry

        Returns:
            The created Note entry
        """
        files = validated_data.pop("files", None)
        validated_data = validated_data

        # save the referenced entries to be used when creating the note
        user = self.context["request"].user
        note = TaskScheduler(user, **validated_data).run_pipeline()

        if files is not None:
            file_reference_models = [
                FileReference(note=note, **file_data) for file_data in files
            ]
            FileReference.objects.bulk_create(file_reference_models)

        return note


class NoteEditSerializer(serializers.ModelSerializer):
    content = serializers.CharField(required=False, allow_blank=True)
    files = FileReferenceSerializer(
        required=False,
        many=True,
    )

    class Meta:
        model = Note
        fields = ["publishable", "content", "files"]

    def update(self, instance: Note, validated_data: dict[str, Any]):
        user = self.context["request"].user

        updated_files = validated_data.pop("files", None)
        content = validated_data.pop("content", None)

        if updated_files is not None:
            existing_files = set([i.id for i in instance.files.all()])
            files_kept = set([i["id"] for i in updated_files if "id" in i])

            # Remove files that are no longer used
            FileReference.objects.filter(id__in=(existing_files - files_kept)).delete()

            # Create new file references
            new_files = [
                FileReference(note=instance, **file_data)
                for file_data in updated_files
                if file_data.get("id", None) not in existing_files
            ]
            FileReference.objects.bulk_create(new_files)

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
    """Entry serializer for file references"""

    class Meta:
        model = Entry
        fields = ["id", "name"]

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        if hasattr(instance, "entry_class") and instance.entry_class:
            representation["type"] = instance.entry_class.type
            representation["subtype"] = instance.entry_class.subtype
        return representation


class FileReferenceWithNoteSerializer(serializers.ModelSerializer):
    note_id = serializers.SerializerMethodField(read_only=True)
    entities = OptimizedEntryResponseSerializer(many=True, read_only=True)

    class Meta:
        model = FileReference
        fields = [
            "id",
            "minio_file_name",
            "mimetype",
            "entities",
            "file_name",
            "bucket_name",
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
            "minio_file_name": file_ref.minio_file_name,
            "mimetype": file_ref.mimetype,
            "file_name": file_ref.file_name,
            "bucket_name": file_ref.bucket_name,
            "timestamp": file_ref.timestamp.isoformat(),
            "note_id": str(file_ref.note.id) if file_ref.note else None,
            "md5_hash": file_ref.md5_hash,
            "sha1_hash": file_ref.sha1_hash,
            "sha256_hash": file_ref.sha256_hash,
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
            "publishable": note.publishable,
            "status": note.status,
            "status_message": note.status_message,
            "status_timestamp": note.status_timestamp.isoformat()
            if note.status_timestamp
            else None,
            "content": self._truncate_content(note.content),
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

        entry_classes = set()
        for entry in note.entries.all():
            if hasattr(entry, "entry_class") and entry.entry_class:
                entry_classes.add(entry.entry_class.subtype)
        data["entry_classes"] = list(entry_classes)
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

    def _truncate_content(self, content):
        """Truncate content if needed"""
        if self.truncate == -1 or len(content) <= self.truncate:
            return content
        return content[: self.truncate] + "..."

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
    entries = EntryTypesCompressedTreeSerializer()

    class Meta:
        model = Note
        fields = [
            "id",
            "publishable",
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
        data = super().to_representation(obj)

        data["entry_classes"] = data.pop("entries")

        if self.truncate == -1:
            return data

        # Optimize string operations for truncation
        content = data["content"]
        if len(content) > self.truncate:
            data["content"] = content[: self.truncate] + "..."

        return data


class NotePublishSerializer(serializers.ModelSerializer):
    publishable = serializers.BooleanField(required=True)

    class Meta:
        model = Note
        fields = ["publishable"]


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

    def __check_publishable(self, notes) -> None:
        if notes.filter(publishable=False).exists():
            raise NoteNotPublishableException(
                "Not all requested notes are publishable."
            )

    def validate_note_ids(self, value: Any) -> Any:
        """Validates a list of note IDs.

        This method checks the following:
        1. Ensures the note IDs are unique.
        2. Checks if the notes exist in the database.
        3. Verifies if the notes are publishable.

        Args:
            value (Any): The value to be validated, expected to be a list of note IDs.

        Returns:
            Any: The validated value, which is the list of note IDs.

        Raises:
            InvalidRequestException: If the note IDs are not unique.
            NoteDoesNotExistException: If one of the requested notes does not exist.
            NoteNotPublishable: If any of the requested notes are not publishable.
        """
        required_notes = Note.objects.filter(id__in=value)
        self.__check_unique(value)
        self.__check_exists(required_notes, value)
        self.__check_publishable(required_notes)
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

    files = FileReferenceSerializer(many=True, required=False)

    class Meta:
        model = Note
        fields = ["id", "content", "timestamp", "files"]
        read_only_fields = ["id", "timestamp"]

    def create(self, validated_data):
        files_data = validated_data.pop("files", [])
        request = self.context.get("request")
        user = cast(CradleUser, request.user)

        # Always create as fleeting note
        validated_data["fleeting"] = True
        validated_data["author"] = user
        validated_data["editor"] = user

        note = Note.objects.create(**validated_data)

        if files_data is not None:
            file_reference_models = [
                FileReference(note=note, **file_data)
                for file_data in files_data
                if "id" not in file_data
            ]
            FileReference.objects.bulk_create(file_reference_models)

        return note

    def update(self, instance, validated_data):
        updated_files = validated_data.pop("files", [])
        request = self.context.get("request")
        user = cast(CradleUser, request.user)

        # Update basic fields
        instance.content = validated_data.get("content", instance.content)
        instance.editor = user
        instance.fleeting = True
        instance.save()

        if updated_files is not None:
            existing_files = set([i.id for i in instance.files.all()])
            files_kept = set([i["id"] for i in updated_files if "id" in i])

            # Remove files that are no longer used
            FileReference.objects.filter(id__in=(existing_files - files_kept)).delete()

            # Create new file references
            new_files = [
                FileReference(note=instance, **file_data)
                for file_data in updated_files
                if file_data.get("id", None) not in existing_files
            ]
            FileReference.objects.bulk_create(new_files)

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
