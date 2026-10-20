"""Serializers for file transfer API requests and responses."""

from rest_framework import serializers


class FileUploadInitiateSerializer(serializers.Serializer):
    """Request body for upload initiation (parsed by parse_initiate_request to keep upload error codes)."""

    file_name = serializers.CharField(help_text="Name of the file to be uploaded")
    file_size = serializers.IntegerField(help_text="Size of the file to be uploaded in bytes")


class FileUploadResponseSerializer(serializers.Serializer):
    """Response serializer for file upload initiation."""

    upload_id = serializers.UUIDField(help_text="UUID for this upload session")
    presigned_url = serializers.CharField(help_text="S3 presigned PUT URL for uploading the file")
    object_key = serializers.CharField(help_text="S3 object key where the file will be stored")
    expires_at = serializers.DateTimeField(help_text="When the presigned URL expires")


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
    expires_at = serializers.DateTimeField(help_text="When the download URL expires")
