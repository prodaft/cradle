from entries.serializers import EntryResponseSerializer
from notes.serializers import NoteRetrieveSerializer
from rest_framework import serializers


class HomePageStatisticsSerializer(serializers.Serializer):
    notes = NoteRetrieveSerializer(truncate=150, many=True)
    entities = EntryResponseSerializer(many=True)
    artifacts = EntryResponseSerializer(many=True)
