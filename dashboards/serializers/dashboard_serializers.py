from rest_framework import serializers
from entities.serializers.entity_serializers import (
    ActorSerializer,
    MetadataSerializer,
    EntrySerializer,
)
from .entity_dashboard_serializers import NoteDashboardSerializer, CaseAccessSerializer


class CaseDashboardSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    description = serializers.CharField()
    type = serializers.CharField()
    subtype = serializers.CharField()
    notes = NoteDashboardSerializer(many=True)
    actors = ActorSerializer(many=True)
    cases = CaseAccessSerializer(many=True)
    metadata = MetadataSerializer(many=True)
    entries = EntrySerializer(many=True)
