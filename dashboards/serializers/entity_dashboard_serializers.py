from rest_framework import serializers
from entities.models import Entity
from notes.models import Note
from entities.serializers.entity_serializers import EntitySerializer


class NoteDashboardSerializer(serializers.ModelSerializer):
    entities = EntitySerializer(many=True)

    class Meta:
        model = Note
        fields = ["id", "content", "timestamp", "entities"]


class CaseAccessSerializer(serializers.ModelSerializer):
    access = serializers.BooleanField()

    class Meta:
        model = Entity
        fields = ["name", "description", "access"]
