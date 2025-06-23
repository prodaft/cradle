from datetime import timedelta
from .strategies import PUBLISH_STRATEGIES
from rest_framework import serializers
from drf_spectacular.utils import extend_schema_field

from .models import PublishedReport, ReportStatus
from file_transfer.utils import MinioClient
from file_transfer.models import FileReference


class ReportSerializer(serializers.ModelSerializer):
    note_ids = serializers.SerializerMethodField()
    report_url = serializers.SerializerMethodField()
    strategy_label = serializers.SerializerMethodField()

    class Meta:
        model = PublishedReport
        fields = [
            "id",
            "title",
            "status",
            "anonymized",
            "created_at",
            "strategy",
            "strategy_label",
            "report_url",
            "error_message",
            "note_ids",
            "extra_data",
        ]

    @extend_schema_field(serializers.ListField(child=serializers.CharField()))
    def get_note_ids(self, obj):
        return list(obj.notes.values_list("id", flat=True))

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_report_url(self, obj):
        if obj.status != ReportStatus.DONE:
            return None

        if obj.external_ref:
            strategy = PUBLISH_STRATEGIES.get(obj.strategy.lower())
            if strategy:
                return strategy(False).get_remote_url(obj)

        if FileReference.objects.filter(report=obj).exists():
            client = MinioClient()
            return client.create_presigned_get(
                obj.file.bucket_name,
                obj.file.minio_file_name,
                expiry_time=timedelta(hours=8),
            )

        return None

    @extend_schema_field(serializers.CharField())
    def get_strategy_label(self, obj):
        return obj.get_strategy_display()


class EditReportSerializer(serializers.Serializer):
    note_ids = serializers.ListField(
        child=serializers.CharField(),
        allow_empty=False,
        help_text="List of note IDs to update the report with.",
    )
    title = serializers.CharField(help_text="New title for the published report.")


class PublishReportSerializer(serializers.Serializer):
    note_ids = serializers.ListField(
        child=serializers.CharField(),
        allow_empty=False,
        help_text="List of note IDs to publish.",
    )
    title = serializers.CharField(help_text="Title for the published report.")
    strategy = serializers.CharField(help_text="Name of the strategy to use.")
    anonymized = serializers.BooleanField(
        help_text="Whether the report should be anonymized.", default=False
    )

    def validate_strategy(self, value):
        from .models import UploadStrategies, DownloadStrategies

        allowed = [choice[0] for choice in UploadStrategies.choices] + [
            choice[0] for choice in DownloadStrategies.choices
        ]
        if value not in allowed:
            raise serializers.ValidationError("Invalid strategy.")
        return value
