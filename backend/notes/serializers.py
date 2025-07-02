from datetime import timedelta
from rest_framework import serializers
from drf_spectacular.utils import extend_schema_field

from file_transfer.exceptions import MinioObjectNotFound
from file_transfer.utils import MinioClient
from .models import Note, Snippet
from .processor.task_scheduler import TaskScheduler
from .exceptions import (
    NoteIsEmptyException,
    InvalidRequestException,
    NoteDoesNotExistException,
    NoteNotPublishableException,
)
from entries.serializers import (
    EntryResponseSerializer,
    EntryTypesCompressedTreeSerializer,
)
from typing import Any, Dict
from file_transfer.serializers import FileReferenceSerializer
from file_transfer.models import FileReference
from user.serializers import UserRetrieveSerializer
from entries.models import Entry, EntryClass
from user.models import CradleUser
from typing import cast
import frontmatter
from .markdown.common import ErrorBypassYAMLHandler


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


class FileReferenceWithNoteSerializer(serializers.ModelSerializer):
    note_id = serializers.SerializerMethodField(read_only=True)
    entities = EntryResponseSerializer(many=True, read_only=True)

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


class NoteRetrieveSerializer(serializers.ModelSerializer):
    files = FileReferenceWithNoteSerializer(many=True)
    author = UserRetrieveSerializer()
    editor = UserRetrieveSerializer()
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

        _, data["content"] = frontmatter.parse(
            data["content"], handler=ErrorBypassYAMLHandler()
        )

        if len(data["content"]) > self.truncate:
            data["content"] = data["content"][: self.truncate] + "..."

        return data


class NoteRetrieveWithLinksSerializer(NoteRetrieveSerializer):
    files = FileReferenceWithNoteSerializer(many=True)

    def to_representation(self, obj: Any) -> Dict[str, Any]:
        data = super().to_representation(obj)

        data["content"] += "\n\n"
        for i in obj.files.all():
            try:
                data["content"] += f"""[{i.minio_file_name}]: {
                    MinioClient().create_presigned_get(
                        i.bucket_name, i.minio_file_name, timedelta(minutes=5)
                    )
                } "{i.file_name}"\n"""
            except MinioObjectNotFound:
                pass

        data.pop("files", None)

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
