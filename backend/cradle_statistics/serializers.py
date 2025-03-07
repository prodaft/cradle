from rest_framework import serializers
from entries.serializers import EntryResponseSerializer
from notes.serializers import NoteRetrieveWithLinksSerializer


class HomePageStatisticsSerializer(serializers.Serializer):
    notes = NoteRetrieveWithLinksSerializer(truncate=150, many=True)
    entities = EntryResponseSerializer(many=True)
    artifacts = EntryResponseSerializer(many=True)
