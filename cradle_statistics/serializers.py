from rest_framework import serializers
from dashboards.serializers import NoteDashboardSerializer
from entries.serializers import EntryResponseSerializer


class HomePageStatisticsSerializer(serializers.Serializer):
    notes = NoteDashboardSerializer(many=True)
    cases = EntryResponseSerializer(many=True)
    actors = EntryResponseSerializer(many=True)
