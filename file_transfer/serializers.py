from rest_framework import serializers


class FileUploadSerializer(serializers.Serializer):
    bucket_name = serializers.CharField()
    minio_file_name = serializers.CharField()
    presigned = serializers.CharField()


class FileDownloadSerializer(serializers.Serializer):
    presigned = serializers.CharField()
