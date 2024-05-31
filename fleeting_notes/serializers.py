from fleeting_notes.models import FleetingNote
from rest_framework import serializers


class FleetingNoteRetrieveSerializer(serializers.ModelSerializer):
    class Meta:
        model = FleetingNote
        fields = ["id", "content", "last_updated"]


class FleetingNoteCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = FleetingNote
        fields = ["content"]

    def create(self, validated_data):
        user = self.context["request"].user
        validated_data["user"] = user
        return super().create(validated_data)
