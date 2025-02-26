from rest_framework import serializers
from .models import PublishedReport
from notes.models import Note


class ReportSerializer(serializers.ModelSerializer):
    note_ids = serializers.SerializerMethodField()

    class Meta:
        model = PublishedReport
        fields = ["id", "created_at", "strategy", "report_location", "note_ids"]

    def get_note_ids(self, obj):
        return list(obj.notes.values_list("id", flat=True))


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
