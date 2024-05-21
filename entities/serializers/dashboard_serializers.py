from rest_framework import serializers
from ..models import Entity
from notes.models import Note
from .entity_serializers import (
    CaseSerializer,
    ActorSerializer,
    MetadataSerializer,
    EntrySerializer,
)


class EntityDashboardSerializer(serializers.ModelSerializer):
    class Meta:
        model = Entity
        fields = ["name", "type", "subtype"]


class NoteDashboardSerializer(serializers.ModelSerializer):
    entities = EntityDashboardSerializer(many=True)

    class Meta:
        model = Note
        fields = ["id", "content", "timestamp", "entities"]


class CaseAccessSerializer(serializers.ModelSerializer):
    access = serializers.BooleanField()

    class Meta:
        model = Entity
        fields = ["name", "description", "access"]


class CaseDashboardSerializer(serializers.Serializer):
    case = CaseSerializer()
    notes = NoteDashboardSerializer(many=True)
    actors = ActorSerializer(many=True)
    cases = CaseAccessSerializer(many=True)
    metadata = MetadataSerializer(many=True)
    entries = EntrySerializer(many=True)
