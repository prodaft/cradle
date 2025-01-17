from typing import Any, Dict
from rest_framework import serializers
from entries.serializers import EntryResponseSerializer, EntrySerializer
from file_transfer.serializers import FileReferenceSerializer
from notes.models import Note


class NoteDashboardSerializer(serializers.ModelSerializer):
    entries = EntrySerializer(many=True)
    files = FileReferenceSerializer(many=True)

    class Meta:
        model = Note
        fields = [
            "id",
            "content",
            "publishable",
            "timestamp",
            "entries",
            "files",
        ]

    def to_representation(self, obj: Any) -> Dict[str, Any]:
        """When the note is serialized if it contains more than 200 characters
        the content is truncated to 200 characters and "..." is appended to the end.

        Args:
            obj (Any): The note object.

        Returns:
            Dict[str, Any]: The serialized note object.
        """
        data = super().to_representation(obj)

        if len(data["content"]) > 200:
            data["content"] = data["content"][:200] + "..."

        return data


class HomePageStatisticsSerializer(serializers.Serializer):
    notes = NoteDashboardSerializer(many=True)
    entities = EntryResponseSerializer(many=True)
    artifacts = EntryResponseSerializer(many=True)
