from datetime import timedelta
from rest_framework import serializers
from .models import PublishedReport, ReportMode, ReportStatus
from file_transfer.utils import MinioClient


class ReportSerializer(serializers.ModelSerializer):
    note_ids = serializers.SerializerMethodField()
    report_location = serializers.SerializerMethodField()

    class Meta:
        model = PublishedReport
        fields = [
            "id",
            "title",
            "status",
            "created_at",
            "strategy",
            "report_location",
            "error_message",
            "note_ids",
        ]

    def get_note_ids(self, obj):
        return list(obj.notes.values_list("id", flat=True))

    def get_report_location(self, obj):
        if obj.mode == ReportMode.DOWNLOAD and obj.status == ReportStatus.DONE:
            bucket_name = str(obj.user.id) if obj.user else "default_bucket"
            return MinioClient().create_presigned_get(
                bucket_name, obj.report_location, timedelta(hours=1)
            )
        return obj.report_location


class PublishReportSerializer(serializers.Serializer):
    note_ids = serializers.ListField(
        child=serializers.CharField(),
        allow_empty=False,
        help_text="List of note IDs to publish.",
    )
    title = serializers.CharField(help_text="Title for the published report.")
    strategy = serializers.CharField(help_text="Name of the strategy to use.")

    def validate_strategy(self, value):
        from .models import UploadStrategies, DownloadStrategies

        allowed = [choice[0] for choice in UploadStrategies.choices] + [
            choice[0] for choice in DownloadStrategies.choices
        ]
        if value not in allowed:
            raise serializers.ValidationError("Invalid strategy.")
        return value
