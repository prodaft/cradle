from rest_framework import serializers
from entities.serializers import (
    ActorResponseSerializer,
    MetadataResponseSerializer,
    EntryResponseSerializer,
    CaseResponseSerializer,
    EntitySerializer,
)
from notes.models import Note


class NoteDashboardSerializer(serializers.ModelSerializer):
    entities = EntitySerializer(many=True)

    class Meta:
        model = Note
        fields = ["id", "content", "publishable", "timestamp", "entities"]

    def to_representation(self, obj: dict) -> dict:
        """When the note is serialized if it contains more than 200 characters
        the content is truncated to 200 characters and "..." is appended to the end.

        Args:
            obj (dict): The note object.

        Returns:
            dict: The serialized note object.
        """
        data = super(NoteDashboardSerializer, self).to_representation(obj)

        if len(data["content"]) > 200:
            data["content"] = data["content"][:200] + "..."

        return data


class CaseDashboardSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    description = serializers.CharField()
    type = serializers.CharField()
    subtype = serializers.CharField()
    notes = NoteDashboardSerializer(many=True)
    actors = ActorResponseSerializer(many=True)
    cases = CaseResponseSerializer(many=True)
    metadata = MetadataResponseSerializer(many=True)
    entries = EntryResponseSerializer(many=True)
    inaccessible_cases = CaseResponseSerializer(many=True)
    access = serializers.CharField()

    def to_representation(self, instance: dict) -> dict:
        """Changes the name and description of the inaccessible cases
        to "Some Case" and "Some Description".

        Args:
            instance (dict): The case object.

        Returns:
            dict: The serialized case object.
        """
        data = super().to_representation(instance)

        for case in data["inaccessible_cases"]:
            case["name"] = "Some Case"
            case["description"] = "Some Description"

        return data


class ActorDashboardSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    description = serializers.CharField()
    type = serializers.CharField()
    subtype = serializers.CharField()
    notes = NoteDashboardSerializer(many=True)
    actors = ActorResponseSerializer(many=True)
    cases = CaseResponseSerializer(many=True)
    metadata = MetadataResponseSerializer(many=True)
    inaccessible_cases = CaseResponseSerializer(many=True)

    def to_representation(self, instance: dict) -> dict:
        """Changes the name and description of the inaccessible cases
        to "Some Case" and "Some Description".

        Args:
            instance (dict): The case object.

        Returns:
            dict: The serialized case object.
        """

        data = super().to_representation(instance)

        for case in data["inaccessible_cases"]:
            case["name"] = "Some Case"
            case["description"] = "Some Description"

        return data


class EntryDashboardSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    description = serializers.CharField()
    type = serializers.CharField()
    subtype = serializers.CharField()
    notes = NoteDashboardSerializer(many=True)
    cases = CaseResponseSerializer(many=True)
    inaccessible_cases = CaseResponseSerializer(many=True)

    def to_representation(self, instance: dict) -> dict:
        """Changes the name and description of the inaccessible cases
        to "Some Case" and "Some Description".

        Args:
            instance (dict): The case object.

        Returns:
            dict: The serialized case object.
        """

        data = super().to_representation(instance)

        for case in data["inaccessible_cases"]:
            case["name"] = "Some Case"
            case["description"] = "Some Description"

        return data
