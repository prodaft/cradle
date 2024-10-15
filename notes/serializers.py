from rest_framework import serializers
from .models import Note
from .processor.task_scheduler import TaskScheduler
from .exceptions import (
    NoteIsEmptyException,
    InvalidRequestException,
    NoteDoesNotExistException,
    NoteNotPublishableException,
)
from entries.serializers import EntryResponseSerializer
from typing import Any
from file_transfer.serializers import FileReferenceSerializer
from file_transfer.models import FileReference
from user.serializers import UserRetrieveSerializer
from entries.models import Entry


class NoteCreateSerializer(serializers.ModelSerializer):
    content = serializers.CharField(required=False, allow_blank=True)
    files = FileReferenceSerializer(required=False, many=True)

    class Meta:
        model = Note
        fields = ["author", "publishable", "content", "files"]

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

        user = self.context["request"].user
        data["author"] = user
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

        # save the referenced entries to be used when creating the note
        user = self.context["request"].user
        note = TaskScheduler(self.content, user).run_pipeline()

        if files is not None:
            file_reference_models = [
                FileReference(note=note, **file_data) for file_data in files
            ]
            FileReference.objects.bulk_create(file_reference_models)

        return note

    def update(self, instance: Note, validated_data: dict[str, Any]):
        user = self.context["request"].user
        artifact_ids = set(instance.entries.is_artifact().values_list("id", flat=True))

        note = TaskScheduler(validated_data["content"], user).run_pipeline(instance)

        files = validated_data.pop("files", None)

        existing_files = set([i.id for i in note.files.all()])
        files_kept = set([i["id"] for i in files if "id" in i])

        # Remove files that are no longer used
        FileReference.objects.filter(id__in=(existing_files - files_kept)).delete()

        if files is not None:
            file_reference_models = [
                FileReference(note=note, **file_data)
                for file_data in files
                if "id" not in file_data
            ]

            # Create the new files
            FileReference.objects.bulk_create(file_reference_models)

        Entry.objects.filter(id__in=artifact_ids).unreferenced().delete()

        return note


class NoteRetrieveSerializer(serializers.ModelSerializer):
    files = FileReferenceSerializer(many=True)
    author = UserRetrieveSerializer()
    editor = UserRetrieveSerializer()

    class Meta:
        model = Note
        fields = [
            "id",
            "publishable",
            "content",
            "timestamp",
            "author",
            "edit_timestamp",
            "editor",
            "files",
        ]


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
