from rest_framework import serializers
from entities.serializers import EntityResponseSerializer, EntitySerializer
from notes.models import Note
from typing import List, Dict, Any
from file_transfer.serializers import FileReferenceSerializer


class NoteDashboardSerializer(serializers.ModelSerializer):
    entities = EntitySerializer(many=True)
    files = FileReferenceSerializer(many=True)

    class Meta:
        model = Note
        fields = [
            "id",
            "content",
            "publishable",
            "timestamp",
            "entities",
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
            "cases": "Some Case",
            "entries": "Some Entry",
            "metadata": "Some Metadata",
            "actors": "Some Actor",
        }
        return names[name.removeprefix("second_hop_").removeprefix("inaccessible_")]

    def update_inaccessible_fields(
        self, data: Dict[str, Any], fields: List[str]
    ) -> None:
        """Changes the `name` and `description` of the inaccessible entities.

        Args:
            data (Dict[str, Any]): The data to update.
            fields (List[str]): The fields to update.

        """

        for field in fields:
            for item in data[field]:
                item["name"] = self._get_name_for_field(field)
                item["description"] = "Some Description"

    def update_second_hop_fields(self, data: Dict[str, Any], fields: List[str]) -> None:
        """Adds the `neighbor` field to the second hop entities.

        Args:
            data (Dict[str, Any]): The data to update.
            fields (List[str]): The fields to update.
        """

        for field in fields:
            for item in data[field]:
                neighbor = self.context[str(item["id"])]
                item["neighbor"] = EntityResponseSerializer(neighbor, many=True).data

    def to_representation(self, instance: Any) -> Dict[str, Any]:
        """Changes the fields of the dashboard to hide inaccessible entities
        and add the neighbor of the second hop entities.

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
            self.update_second_hop_fields(data, second_hop_fields)

        return data


class CaseDashboardSerializer(BaseDashboardSerializer):
    id = serializers.UUIDField()
    name = serializers.CharField()
    description = serializers.CharField()
    type = serializers.CharField()
    subtype = serializers.CharField()
    notes = NoteDashboardSerializer(many=True)
    actors = EntityResponseSerializer(many=True)
    cases = EntityResponseSerializer(many=True)
    metadata = EntityResponseSerializer(many=True)
    entries = EntityResponseSerializer(many=True)
    inaccessible_cases = EntityResponseSerializer(many=True)
    inaccessible_actors = EntityResponseSerializer(many=True)
    inaccessible_metadata = EntityResponseSerializer(many=True)
    inaccessible_entries = EntityResponseSerializer(many=True)
    second_hop_cases = EntityResponseSerializer(many=True)
    second_hop_actors = EntityResponseSerializer(many=True)
    second_hop_metadata = EntityResponseSerializer(many=True)
    second_hop_inaccessible_cases = EntityResponseSerializer(many=True)
    second_hop_inaccessible_actors = EntityResponseSerializer(many=True)
    second_hop_inaccessible_metadata = EntityResponseSerializer(many=True)
    access = serializers.CharField()

    class Meta:
        inaccessible_fields = [
            "inaccessible_cases",
            "inaccessible_actors",
            "inaccessible_metadata",
            "inaccessible_entries",
            "second_hop_inaccessible_cases",
            "second_hop_inaccessible_actors",
            "second_hop_inaccessible_metadata",
        ]
        second_hop_fields = [
            "second_hop_cases",
            "second_hop_actors",
            "second_hop_metadata",
            "second_hop_inaccessible_cases",
            "second_hop_inaccessible_actors",
            "second_hop_inaccessible_metadata",
        ]


class ActorDashboardSerializer(BaseDashboardSerializer):
    id = serializers.UUIDField()
    name = serializers.CharField()
    description = serializers.CharField()
    type = serializers.CharField()
    subtype = serializers.CharField()
    notes = NoteDashboardSerializer(many=True)
    actors = EntityResponseSerializer(many=True)
    cases = EntityResponseSerializer(many=True)
    metadata = EntityResponseSerializer(many=True)
    inaccessible_cases = EntityResponseSerializer(many=True)
    inaccessible_actors = EntityResponseSerializer(many=True)
    inaccessible_metadata = EntityResponseSerializer(many=True)
    second_hop_cases = EntityResponseSerializer(many=True)
    second_hop_actors = EntityResponseSerializer(many=True)
    second_hop_metadata = EntityResponseSerializer(many=True)
    second_hop_inaccessible_cases = EntityResponseSerializer(many=True)
    second_hop_inaccessible_actors = EntityResponseSerializer(many=True)
    second_hop_inaccessible_metadata = EntityResponseSerializer(many=True)

    class Meta:
        inaccessible_fields = [
            "inaccessible_cases",
            "inaccessible_actors",
            "inaccessible_metadata",
            "second_hop_inaccessible_cases",
            "second_hop_inaccessible_actors",
            "second_hop_inaccessible_metadata",
        ]
        second_hop_fields = [
            "second_hop_cases",
            "second_hop_actors",
            "second_hop_metadata",
            "second_hop_inaccessible_cases",
            "second_hop_inaccessible_actors",
            "second_hop_inaccessible_metadata",
        ]


class EntryDashboardSerializer(BaseDashboardSerializer):
    id = serializers.UUIDField()
    name = serializers.CharField()
    description = serializers.CharField()
    type = serializers.CharField()
    subtype = serializers.CharField()
    notes = NoteDashboardSerializer(many=True)
    cases = EntityResponseSerializer(many=True)
    inaccessible_cases = EntityResponseSerializer(many=True)
    second_hop_cases = EntityResponseSerializer(many=True)
    second_hop_inaccessible_cases = EntityResponseSerializer(many=True)

    class Meta:
        inaccessible_fields = ["inaccessible_cases", "second_hop_inaccessible_cases"]
        second_hop_fields = ["second_hop_cases", "second_hop_inaccessible_cases"]
