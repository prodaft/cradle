from rest_framework import serializers

from .models import FileReference


class FileUploadResponseSerializer(serializers.Serializer):
    """Response serializer for file upload initiation."""

    upload_id = serializers.UUIDField()
    presigned_url = serializers.CharField()
    object_key = serializers.CharField()
    expires_in = serializers.IntegerField(help_text="Expiration time in seconds")


class FileUploadFinalizeSerializer(serializers.Serializer):
    """Request serializer for finalizing file upload."""

    note_id = serializers.UUIDField(required=False, allow_null=True)


class FileUploadFinalizeResponseSerializer(serializers.Serializer):
    """Response serializer for finalized file upload."""

    file_id = serializers.UUIDField()
    file_name = serializers.CharField()
    object_key = serializers.CharField()


class FileDownloadSerializer(serializers.Serializer):
    """Response serializer for file download."""

    presigned_url = serializers.CharField()
    expires_in = serializers.IntegerField(help_text="Expiration time in seconds")


class FileReferenceSerializer(serializers.ModelSerializer):
    """Serializer for FileReference model."""

    id = serializers.UUIDField(required=False)

    class Meta:
        model = FileReference
        fields = [
            "id",
            "file_name",
            "timestamp",
            "file_size",
            "mimetype",
            "md5_hash",
            "sha1_hash",
            "sha256_hash",
        ]
        read_only_fields = ["timestamp", "mimetype", "md5_hash", "sha1_hash", "sha256_hash"]


class FileProcessSerializer(serializers.Serializer):
    """Request serializer for file processing."""

    file_id = serializers.UUIDField(required=True)
