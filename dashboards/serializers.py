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
    access = serializers.CharField()


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
