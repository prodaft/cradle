"""Serializers for event log API responses."""

from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers
from rest_framework.fields import SerializerMethodField

from user.serializers import EssentialUserRetrieveSerializer

from .models import EventLog


class EventLogSerializer(serializers.ModelSerializer):
    """Serializer for EventLog list/detail API responses."""

    user = EssentialUserRetrieveSerializer()
    src_log = SerializerMethodField()

    content_type = SerializerMethodField()
    object_id = serializers.CharField(read_only=True, help_text="Primary key of the content object")

    object_repr = SerializerMethodField()

    class Meta:
        model = EventLog
        fields = [
            "id",
            "timestamp",
            "type",
            "user",
            "details",
            "src_log",
            "content_type",
            "object_id",
            "object_repr",
        ]
        extra_kwargs = {
            "timestamp": {"help_text": "When the event was recorded"},
            "type": {"help_text": "Event type (create, edit, delete, fetch, login)"},
            "details": {"help_text": "Optional JSON-serialized extra context"},
        }

    @extend_schema_field(serializers.DictField(allow_null=True))
    def get_src_log(self, obj: EventLog):
        """Return nested serializer data for the source log, or None."""
        return EventLogSerializer(obj.src_log).data if obj.src_log else None

    @extend_schema_field(serializers.CharField())
    def get_content_type(self, obj: EventLog) -> str:
        """Return the content type model name."""
        return obj.content_type.model

    @extend_schema_field(serializers.CharField())
    def get_object_repr(self, obj: EventLog) -> str:
        """Return string representation of the content object, or 'DELETED' if gone."""
        if obj.content_object is None:
            return "DELETED"

        return obj.content_object.__repr__()
