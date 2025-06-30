from rest_framework import serializers
from rest_framework.fields import SerializerMethodField
from drf_spectacular.utils import extend_schema_field

from user.serializers import EssentialUserRetrieveSerializer
from .models import EventLog


class EventLogSerializer(serializers.ModelSerializer):
    user = EssentialUserRetrieveSerializer()
    src_log = SerializerMethodField()

    content_type = SerializerMethodField()
    object_id = serializers.PrimaryKeyRelatedField(read_only=True)

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

        read_only_fields = [
            "id",
            "timestamp",
        ]  # Since these fields are generated automatically

    @extend_schema_field(serializers.DictField(allow_null=True))
    def get_src_log(self, obj):
        if obj.src_log is not None:
            return EventLogSerializer(obj.src_log).data
        else:
            return None

    @extend_schema_field(serializers.CharField())
    def get_content_type(self, obj):
        return obj.content_type.model

    @extend_schema_field(serializers.CharField())
    def get_object_repr(self, obj):
        if obj.content_object is None:
            return "DELETED"

        return obj.content_object.__repr__()
