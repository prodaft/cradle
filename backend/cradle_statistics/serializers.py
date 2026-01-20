from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers


class StatisticsUserSerializer(serializers.Serializer):
    """Serializer for user in statistics"""

    id = serializers.CharField()
    username = serializers.CharField()


class StatisticsNoteSerializer(serializers.Serializer):
    """Serializer for notes in statistics"""

    id = serializers.CharField()
    content = serializers.SerializerMethodField()
    title = serializers.CharField()
    timestamp = serializers.DateTimeField()
    author = StatisticsUserSerializer()

    def __init__(self, *args, truncate=150, **kwargs):
        self.truncate = truncate
        super().__init__(*args, **kwargs)

    @extend_schema_field(serializers.CharField())
    def get_content(self, note):
        content = note.content
        if self.truncate > -1 and len(content) - note.content_offset > self.truncate:
            content = content[note.content_offset : note.content_offset + self.truncate] + "..."
        return content


class StatisticsEntrySerializer(serializers.Serializer):
    """Serializer for entries in statistics"""

    id = serializers.CharField()
    name = serializers.CharField()
    type = serializers.CharField(source="entry_class.type")
    subtype = serializers.CharField(source="entry_class.subtype")


class HomePageStatisticsSerializer(serializers.Serializer):
    notes = StatisticsNoteSerializer(truncate=150, many=True)
    entities = StatisticsEntrySerializer(many=True)
    artifacts = StatisticsEntrySerializer(many=True)
