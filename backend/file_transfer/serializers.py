"""Serializers for file transfer API requests and responses."""

from rest_framework import serializers

from .models import FileReference


class FileUploadResponseSerializer(serializers.Serializer):
    """Response serializer for file upload initiation."""

    upload_id = serializers.UUIDField(help_text="UUID for this upload session")
    presigned_url = serializers.CharField(help_text="S3 presigned PUT URL for uploading the file")
    object_key = serializers.CharField(help_text="S3 object key where the file will be stored")
    expires_in = serializers.IntegerField(help_text="Seconds until the presigned URL expires")


class FileUploadFinalizeSerializer(serializers.Serializer):
    """Request serializer for finalizing file upload."""

    note_id = serializers.UUIDField(
        required=False,
        allow_null=True,
        help_text="Optional note UUID to attach the file to",
    )


class FileUploadFinalizeResponseSerializer(serializers.Serializer):
    """Response serializer for finalized file upload."""

    file_id = serializers.UUIDField(help_text="UUID of the created FileReference")
    file_name = serializers.CharField(help_text="Original filename")
    object_key = serializers.CharField(help_text="S3 object key where the file was stored")


class FileDownloadSerializer(serializers.Serializer):
    """Response serializer for file download."""

    presigned_url = serializers.CharField(help_text="S3 presigned GET URL for downloading the file")
    expires_in = serializers.IntegerField(help_text="Seconds until the download URL expires")


class FileReferenceSerializer(serializers.ModelSerializer):
    """Serializer for FileReference model."""

    id = serializers.UUIDField(required=False, help_text="File reference UUID")

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
        read_only_fields = [
            "timestamp",
            "mimetype",
            "md5_hash",
            "sha1_hash",
            "sha256_hash",
        ]
        extra_kwargs = {
            "file_name": {"help_text": "Original filename"},
            "file_size": {"help_text": "File size in bytes"},
            "md5_hash": {"help_text": "MD5 hash of file contents"},
            "sha1_hash": {"help_text": "SHA-1 hash of file contents"},
            "sha256_hash": {"help_text": "SHA-256 hash of file contents"},
        }


class FileProcessSerializer(serializers.Serializer):
    """Request serializer for file processing."""

    file_id = serializers.UUIDField(required=True, help_text="UUID of the FileReference to process")
