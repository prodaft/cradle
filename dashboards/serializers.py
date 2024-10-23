from rest_framework import serializers
from entries.serializers import EntryResponseSerializer, EntrySerializer
from notes.models import Note
from typing import List, Dict, Any
from file_transfer.serializers import FileReferenceSerializer


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


class BaseDashboardSerializer(serializers.Serializer):
    def _get_name_for_field(self, name: str) -> str:
        """Returns the value for the `name` field
        based on the name of the dashboard's field.

        Args:
            name (str): The name of the field.

        Returns:
            str: The value for the `name` field.
        """

        names = {
            "entities": "Some Entity",
            "artifacts": "Some Artifact",
        }
        return names[name.removeprefix("second_hop_").removeprefix("inaccessible_")]

    def update_inaccessible_fields(
        self, data: Dict[str, Any], fields: List[str]
    ) -> None:
        """Changes the `name` and `description` of the inaccessible entries.

        Args:
            data (Dict[str, Any]): The data to update.
            fields (List[str]): The fields to update.

        """

        for field in fields:
            for item in data[field]:
                item["name"] = self._get_name_for_field(field)
                item["description"] = "Some Description"

    def to_representation(self, instance: Any) -> Dict[str, Any]:
        """Changes the fields of the dashboard to hide inaccessible entries
        and add the neighbor of the second hop entries.

        Args:
            instance (Any): The instance to serialize.

        Returns:
            Dict[str, Any]: The serialized instance.
        """
        data = super().to_representation(instance)

        meta: Any = getattr(self, "Meta", None)
        if meta:
            inaccessible_fields = getattr(meta, "inaccessible_fields", [])
            second_hop_fields = getattr(meta, "second_hop_fields", [])

            self.update_inaccessible_fields(data, inaccessible_fields)

        return data


class EntityDashboardSerializer(BaseDashboardSerializer):
    id = serializers.UUIDField()
    name = serializers.CharField()
    description = serializers.CharField()
    type = serializers.CharField()
    subtype = serializers.CharField()
    notes = NoteDashboardSerializer(many=True)
    entities = EntryResponseSerializer(many=True)
    artifacts = EntryResponseSerializer(many=True)
    inaccessible_entities = EntryResponseSerializer(many=True)
    inaccessible_artifacts = EntryResponseSerializer(many=True)
    second_hop_entities = EntryResponseSerializer(many=True)
    second_hop_inaccessible_entities = EntryResponseSerializer(many=True)
    access = serializers.CharField()

    class Meta:
        inaccessible_fields = [
            "inaccessible_entities",
            "inaccessible_artifacts",
            "second_hop_inaccessible_entities",
        ]
        second_hop_fields = [
            "second_hop_entities",
            "second_hop_inaccessible_entities",
        ]


class ArtifactDashboardSerializer(BaseDashboardSerializer):
    id = serializers.UUIDField()
    name = serializers.CharField()
    description = serializers.CharField()
    type = serializers.CharField()
    subtype = serializers.CharField()
    notes = NoteDashboardSerializer(many=True)
    entities = EntryResponseSerializer(many=True)
    inaccessible_entities = EntryResponseSerializer(many=True)
    second_hop_entities = EntryResponseSerializer(many=True)
    second_hop_inaccessible_entities = EntryResponseSerializer(many=True)

    class Meta:
        inaccessible_fields = [
            "inaccessible_entities",
            "second_hop_inaccessible_entities",
        ]
        second_hop_fields = ["second_hop_entities", "second_hop_inaccessible_entities"]
