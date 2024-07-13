from rest_framework import serializers
from dashboards.serializers import NoteDashboardSerializer
from entries.serializers import EntryResponseSerializer


class HomePageStatisticsSerializer(serializers.Serializer):
    notes = NoteDashboardSerializer(many=True)
    entities = EntryResponseSerializer(many=True)
    artifacts = EntryResponseSerializer(many=True)
