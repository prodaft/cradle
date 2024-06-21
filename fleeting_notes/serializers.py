from fleeting_notes.models import FleetingNote
from rest_framework import serializers
from file_transfer.serializers import FileReferenceSerializer
from file_transfer.models import FileReference


class FleetingNoteTruncatedRetrieveSerializer(serializers.ModelSerializer):
    files = FileReferenceSerializer(many=True)

    class Meta:
        model = FleetingNote
        fields = ["id", "content", "last_edited", "files"]

    def to_representation(self, instance):
        """
        Overrides the default to_representation method to truncate the content
        field of the FleetingNote entity to 200 characters.

        Args:
            instance: the FleetingNote entity to be serialized

        Returns:
            A dictionary containing the serialized FleetingNote entity
        """
        representation = super().to_representation(instance)
        representation["content"] = (
            representation["content"][:200] + "..."
            if len(representation["content"]) > 200
            else representation["content"]
        )
        return representation


class FleetingNoteSerializer(serializers.ModelSerializer):
    files = FileReferenceSerializer(required=False, many=True)

    class Meta:
        model = FleetingNote
        fields = ["id", "content", "last_edited", "files"]

    def update(self, instance, validated_data):
        """
        Updates the content field of the FleetingNote entity based on the
        validated data.

        Args:
            instance: the FleetingNote entity to be updated
            validated_data: a dictionary containing the attributes of
                the FleetingNote entity

        Returns:
            The updated FleetingNote entity
        """
        instance.content = validated_data.get("content", instance.content)
        instance.save()

        instance.files.all().delete()
        updated_files = validated_data.pop("files", None)
        if updated_files is not None:
            file_reference_models = [
                FileReference(fleeting_note=instance, **file_data)
                for file_data in updated_files
            ]
            FileReference.objects.bulk_create(file_reference_models)

        return instance

    def create(self, validated_data):
        """Creates a new Fleeting Note entity based on the validated data.
        Moreover, it sets the files field to correspond to the
        file references that are linked to the Fleeting Note.

        Args:
            validated_data: a dictionary containing the attributes of
                the Fleeting Note entity

        Returns:
            The created Fleeting Note entity
        """
        validated_data["user"] = self.context["request"].user

        files = validated_data.pop("files", None)

        fleeting_note = FleetingNote.objects.create(**validated_data)

        if files is not None:
            file_reference_models = [
                FileReference(fleeting_note=fleeting_note, **file_data)
                for file_data in files
            ]
            FileReference.objects.bulk_create(file_reference_models)

        return fleeting_note
