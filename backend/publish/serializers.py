"""Serializers for published reports and publish strategy responses."""

import uuid

from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from file_transfer.s3_utils import presign_get
from file_transfer.storage import ReportStorage

from .constants import PUBLISH_REPORT_PRESIGNED_DOWNLOAD_EXPIRY_SECONDS
from .models import DownloadStrategies, PublishedReport, ReportStatus, UploadStrategies
from .strategies import PUBLISH_STRATEGIES


class ReportDetailSerializer(serializers.ModelSerializer):
    """Serializer for full report details including presigned download URL and note IDs."""

    note_ids = serializers.SerializerMethodField(help_text="IDs of notes included in the report.")
    report_url = serializers.SerializerMethodField(
        help_text="Presigned URL to download the report file, or external URL for Catalyst."
    )
    strategy_label = serializers.SerializerMethodField(help_text="Human-readable strategy name.")

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

    @extend_schema_field(serializers.ListField(child=serializers.UUIDField()))
    def get_note_ids(self, obj: PublishedReport) -> list[uuid.UUID]:
        """Return UUIDs of notes included in the report."""
        return list(obj.notes.values_list("id", flat=True))

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_report_url(self, obj: PublishedReport) -> str | None:
        """Return presigned S3 URL, external Catalyst URL, or None if not ready."""
        if obj.status != ReportStatus.DONE:
            return None

        strategy_factory = PUBLISH_STRATEGIES.get((obj.strategy or "").lower())
        download_url = self.context.get("download_url", False)
        response_disposition = (
            f'attachment; filename="{obj.title}.{(obj.strategy or "").lower()}"' if download_url else None
        )

        if obj.external_ref and strategy_factory:
            return strategy_factory(False).get_remote_url(obj)

        if obj.file:
            publisher = strategy_factory(False) if strategy_factory else None
            response_content_type = getattr(publisher, "content_type", None) if publisher else None
            return presign_get(
                ReportStorage.bucket_name,
                obj.file.name,
                expires_in=PUBLISH_REPORT_PRESIGNED_DOWNLOAD_EXPIRY_SECONDS,
                response_content_type=response_content_type,
                response_content_disposition=response_disposition,
            )

        return None

    @extend_schema_field(serializers.CharField())
    def get_strategy_label(self, obj: PublishedReport) -> str:
        """Return human-readable strategy label from model choices."""
        return obj.get_strategy_display()


class ReportListSerializer(ReportDetailSerializer):
    """Serializer for report list items (summary view, no report_url or note_ids)."""

    class Meta(ReportDetailSerializer.Meta):
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


class PublishReportSerializer(serializers.Serializer):
    """Input serializer for creating a new published report."""

    note_ids = serializers.ListField(
        child=serializers.UUIDField(),
        allow_empty=False,
        max_length=100,
        help_text="UUIDs of notes to include in the report.",
    )
    title = serializers.CharField(max_length=512, help_text="Title for the published report.")
    strategy = serializers.ChoiceField(
        choices=UploadStrategies.choices + DownloadStrategies.choices,
        help_text="Strategy to use (upload or download).",
    )
    anonymized = serializers.BooleanField(
        default=False,
        help_text="Whether the report content should be anonymized.",
    )


class PublishStrategySerializer(serializers.Serializer):
    """Serializer for a single publish strategy item."""

    label = serializers.CharField(help_text="Human-readable label for the strategy.")
    strategy = serializers.CharField(help_text="Strategy identifier (e.g. 'html', 'catalyst').")

    class Meta:
        ref_name = "PublishStrategy"


class PublishStrategiesResponseSerializer(serializers.Serializer):
    """Serializer for the publish strategies endpoint response."""

    upload = PublishStrategySerializer(many=True, help_text="Available upload strategies.")
    download = PublishStrategySerializer(many=True, help_text="Available download strategies.")

    class Meta:
        ref_name = "PublishStrategiesResponse"
