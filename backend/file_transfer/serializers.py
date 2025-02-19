from rest_framework import serializers
from .exceptions import MinioObjectNotFound
from .models import FileReference
from .utils import MinioClient
from typing import Any


class FileUploadSerializer(serializers.Serializer):
    bucket_name = serializers.CharField()
    minio_file_name = serializers.CharField()
    presigned = serializers.CharField()
    expires_at = serializers.IntegerField()


class FileDownloadSerializer(serializers.Serializer):
    presigned = serializers.CharField()
    expires_at = serializers.IntegerField()


class FileReferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = FileReference
        fields = ["minio_file_name", "file_name", "bucket_name"]

    def validate(self, data: Any) -> Any:
        """This method validates the file reference entry. Firstly, it checks
        that bucket_name matches the user's id. Secondly, it checks that a file
        was uploaded at the indicated MinIO path.

        Args:
            data: Dictionary containing the data to be validated.

        Returns:
            Any: The data that was provided to the method as an argument.

        Raises:
            IncorrectBucketException: If bucket_name does not match the user's id.
            MinioObjectNotFound: If a file could not be found at the indicated
                MinIO path.

        """
        self.context["request"].user

        if not MinioClient().file_exists_at_path(
            bucket_name=data["bucket_name"], minio_file_name=data["minio_file_name"]
        ):
            raise MinioObjectNotFound()

        return super().validate(data)
