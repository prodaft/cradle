"""Serializers for statistics API responses."""

from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from user.serializers import EssentialUserRetrieveSerializer


class StatisticsNoteSerializer(serializers.Serializer):
    """Serializer for notes in statistics; content may be truncated."""

    id = serializers.UUIDField(help_text="Note UUID.")
    content = serializers.SerializerMethodField(help_text="Note body; truncated when longer than truncate limit.")
    title = serializers.CharField(help_text="Note title.")
    timestamp = serializers.DateTimeField(help_text="When the note was last modified.")
    author = EssentialUserRetrieveSerializer(allow_null=True, help_text="Note author.")

    def __init__(self, *args, truncate=150, **kwargs):
        """Initialize with optional truncate length for content (-1 = no truncation)."""
        self.truncate = truncate
        super().__init__(*args, **kwargs)

    @extend_schema_field(serializers.CharField())
    def get_content(self, note):
        """Return note content, truncated if longer than self.truncate."""
        if note.content_offset >= len(note.content):
            return ""
        content = note.content[note.content_offset :]
        if self.truncate > -1 and len(content) > self.truncate:
            content = content[: self.truncate] + "..."
        return content


class StatisticsEntrySerializer(serializers.Serializer):
    """Serializer for entries (entities/artifacts) in statistics."""

    id = serializers.IntegerField(help_text="Entry ID.")
    name = serializers.CharField(help_text="Entry display name.")
    type = serializers.CharField(source="entry_class.type", help_text="Entry class type (e.g. entity, artifact).")
    subtype = serializers.CharField(source="entry_class.subtype", help_text="Entry class subtype.")


class HomePageStatisticsSerializer(serializers.Serializer):
    """Serializer for homepage statistics: recent notes, entities, and artifacts."""

    notes = StatisticsNoteSerializer(truncate=150, many=True, help_text="10 most recent notes the user has access to.")
    entities = StatisticsEntrySerializer(many=True, help_text="3 most recently referenced entities.")
    artifacts = StatisticsEntrySerializer(
        many=True, help_text="3 most recently referenced artifacts (excluding notes and files)."
    )
