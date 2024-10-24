from rest_framework import serializers
from typing import Any
from notes.serializers import LinkedEntrySerializer


class LinkSerializer(serializers.Serializer):
    first_node = serializers.UUIDField()
    second_node = serializers.UUIDField()

    def to_representation(self, data: Any) -> dict[str, Any]:
        """Takes the validated data in the serializer and
        constructs the JSON representation.

        Args:
            data (Any): the validated serializer data.

        Returns:
            (dict[str, Any]): A dictionary corresponding to the JSON
            representation of the data.

        """
        return {"source": data[0], "target": data[1]}


class KnowledgeGraphSerializer(serializers.Serializer):
    entries = LinkedEntrySerializer(many=True)
    links = LinkSerializer(many=True)
