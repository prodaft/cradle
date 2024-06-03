from fleeting_notes.models import FleetingNote
from rest_framework import serializers


class FleetingNoteRetrieveSerializer(serializers.ModelSerializer):
    class Meta:
        model = FleetingNote
        fields = ["id", "content", "last_edited"]


class FleetingNoteTruncatedRetrieveSerializer(serializers.ModelSerializer):
    class Meta:
        model = FleetingNote
        fields = ["id", "content", "last_edited"]

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


class FleetingNoteCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = FleetingNote
        fields = ["id", "content", "last_edited"]

    def create(self, validated_data):
        """
        Creates a new FleetingNote entity based on the validated data.
        Moreover, it sets the user field to correspond to the
        authenticated user.

        Args:
            validated_data: a dictionary containing the attributes of
                the FleetingNote entity

        Returns:
            The created FleetingNote entity
        """
        validated_data["user"] = self.context["request"].user
        return super().create(validated_data)


class FleetingNoteUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = FleetingNote
        fields = ["id", "content", "last_edited"]

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
        return instance
