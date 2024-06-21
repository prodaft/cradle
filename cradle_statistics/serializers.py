from rest_framework import serializers
from dashboards.serializers import NoteDashboardSerializer
from entities.serializers import EntityResponseSerializer


class HomePageStatisticsSerializer(serializers.Serializer):
    notes = NoteDashboardSerializer(many=True)
    cases = EntityResponseSerializer(many=True)
    actors = EntityResponseSerializer(many=True)
