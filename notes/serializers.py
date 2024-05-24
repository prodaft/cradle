from rest_framework import serializers
from .models import Note
from .utils.task_scheduler import TaskScheduler
from .exceptions import NoteIsEmptyException


class NoteCreateSerializer(serializers.ModelSerializer):
    content = serializers.CharField(required=False)

    class Meta:
        model = Note
        fields = ["content"]

    def validate(self, data):
        """First checks whether the client sent the content of the field
        and that it is non-empty. Then, it calls the TaskScheduler to perform
        all of the validations required for creating a note.

        Args:
            data: a dictionary containing the attributes of
                the Note entity

        Returns:
            True iff the validations pass.

        Raises:
            NoteIsEmptyException: if the client did not sent the content
            of the note or if the content is empty.
            NotEnoughReferencesException: if the note does not reference at
            least one case and at least two entities.
            EntitiesDoNotExistException: if the note references actors or cases
            that do not exist.
            NoAccessToEntitiesException: if the user does not have access to the
            referenced cases.
        """

        if "content" not in data or not data["content"]:
            raise NoteIsEmptyException()

        user = self.context["request"].user

        # save the referenced entities to be used when creating the note
        self.referenced_entities = TaskScheduler(data["content"], user).run_pipeline()

        return super().validate(data)

    def create(self, validated_data):
        """Creates a new Note entity based on the validated data.
        Moreover, it sets the entities field to correspond to the
        referenced_entities field which was persisted in the validate
        method.

        Args:
            validated_data: a dictionary containing the attributes of
                the Note entity

        Returns:
            The created Note entity
        """

        note = Note.objects.create(**validated_data)
        note.entities.set(self.referenced_entities)
        return note


class NoteRetrieveSerializer(serializers.ModelSerializer):
    class Meta:
        model = Note
        fields = ["id", "content", "timestamp"]
