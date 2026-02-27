from rest_framework import serializers
from .models import Setting


class SettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Setting
        fields = ["key", "value"]


class ManagementActionResponseSerializer(serializers.Serializer):
    """Serializer for management action response (RFC 9457-aligned)."""

    detail = serializers.CharField(help_text="Success message")

    class Meta:
        ref_name = "ManagementActionResponse"
