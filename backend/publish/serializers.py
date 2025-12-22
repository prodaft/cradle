from datetime import timedelta

from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from file_transfer.models import FileReference
from file_transfer.utils import MinioClient

from .models import DownloadStrategies, PublishedReport, ReportStatus, UploadStrategies
from .strategies import PUBLISH_STRATEGIES


class ReportDetailSerializer(serializers.ModelSerializer):
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
        download_url = self.context.get("download_url", False)
        if download_url:
            extra_headers = {
                "Response-Content-Disposition": f"attachment; filename={obj.title}.{obj.strategy.lower()}",
            }
        else:
            extra_headers = {}

        print(download_url, extra_headers)

        if obj.status != ReportStatus.DONE:
            return None

        if obj.external_ref:
            strategy = PUBLISH_STRATEGIES.get(obj.strategy.lower())
            if strategy:
                return strategy(False).get_remote_url(obj)

        if FileReference.objects.filter(report=obj).exists():
            headers = extra_headers
            strategy = PUBLISH_STRATEGIES.get(obj.strategy.lower())
            if strategy:
                headers.update(
                    {
                        "Response-Content-Type": strategy(False).content_type,
                    }
                )

            client = MinioClient()
            return client.create_presigned_get(
                obj.file.bucket_name,
                obj.file.minio_file_name,
                expiry_time=timedelta(hours=8),
                response_headers=headers,
            )

        return None

    @extend_schema_field(serializers.CharField())
    def get_strategy_label(self, obj):
        return obj.get_strategy_display()


class ReportListSerializer(serializers.ModelSerializer):
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
            "error_message",
            "extra_data",
        ]

    @extend_schema_field(serializers.CharField())
    def get_strategy_label(self, obj):
        return obj.get_strategy_display()


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
        allowed = [choice[0] for choice in UploadStrategies.choices] + [
            choice[0] for choice in DownloadStrategies.choices
        ]
        if value not in allowed:
            raise serializers.ValidationError("Invalid strategy.")
        return value


class ReportRetryErrorResponseSerializer(serializers.Serializer):
    """Serializer for report retry error responses."""

    detail = serializers.CharField(help_text="Error detail message")

    class Meta:
        ref_name = "ReportRetryErrorResponse"


class PublishStrategySerializer(serializers.Serializer):
    """Serializer for individual publish strategy."""

    label = serializers.CharField(help_text="Human-readable label for the strategy")
    strategy = serializers.CharField(help_text="Strategy identifier")

    class Meta:
        ref_name = "PublishStrategy"


class PublishStrategiesResponseSerializer(serializers.Serializer):
    """Serializer for publish strategies response."""

    upload = PublishStrategySerializer(
        many=True, help_text="Available upload strategies"
    )
    download = PublishStrategySerializer(
        many=True, help_text="Available download strategies"
    )

    class Meta:
        ref_name = "PublishStrategiesResponse"
