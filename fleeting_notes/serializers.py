from fleeting_notes.models import FleetingNote
from rest_framework import serializers


class FleetingNoteRetrieveSerializer(serializers.ModelSerializer):
    class Meta:
        model = FleetingNote
        fields = ["id", "content", "last_edited"]


class FleetingNoteCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = FleetingNote
        fields = ["content"]

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
        user = self.context["request"].user
        validated_data["user"] = user
        return super().create(validated_data)
