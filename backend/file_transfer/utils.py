"""Legacy MinIO client for backward compatibility.

Prefer file_transfer.s3_utils and django-storages for new code.
"""

import uuid
from datetime import timedelta
from typing import Optional

import urllib3
from minio import Minio

from cradle.settings import MINIO_BACKEND_URL, MINIO_CONFIG

from .exceptions import MinioObjectNotFound


class MinioClient:
    """Singleton MinIO client for presigned URLs and object operations.

    Legacy: new code should use file_transfer.s3_utils with django-storages.
    """

    client: Optional[Minio] = None

    def __new__(cls):
        if not hasattr(cls, "_instance"):
            cls._instance = super().__new__(cls)
            if MINIO_BACKEND_URL is not None:
                cls._instance.client = Minio(http_client=urllib3.ProxyManager(MINIO_BACKEND_URL), **MINIO_CONFIG)
            else:
                cls._instance.client = Minio(**MINIO_CONFIG)

        return cls._instance

    def create_user_bucket(self, bucket_name: str) -> None:
        """Creates a new Minio bucket with the name bucket_name.

        Args:
            bucket_name: The name of the newly created bucket.
        """
        assert self.client is not None  # required by mypy

        self.client.make_bucket(bucket_name)

    def create_presigned_put(
        self,
        bucket_name: str,
        file_name: str,
        expiry_time: timedelta,
    ) -> tuple[str, str]:
        """Generate MinIO object path and presigned put URL for upload.

        Path is bucket_name/<uuid>-<file_name>. URL expires in expiry_time.

        Args:
            bucket_name: The name of the bucket where the new path is generated.
            file_name: The original name of the file.
            expiry_time: Amount of time in which the presigned URL expires.

        Returns:
            A tuple containing the newly generated uuid as well as the presigned
            put URL.
        """
        assert self.client is not None  # required by mypy

        minio_file_name = str(uuid.uuid4()) + "-" + file_name
        presigned_url = self.client.presigned_put_object(
            bucket_name,
            minio_file_name,
            expires=expiry_time,
        )

        return (minio_file_name, presigned_url)

    def create_presigned_get(
        self,
        bucket_name: str,
        minio_file_name: str,
        expiry_time: timedelta,
        response_headers: Optional[dict] = None,
    ) -> str:
        """Generate presigned get URL for downloading objects.

        URL expires in the specified amount of time.

        Args:
            bucket_name: The name of the bucket where the new path is generated.
            minio_file_name: The path to the object inside the bucket.
            expiry_time: Amount of time in which the presigned URL expires.

        Returns:
            Presigned GET URL string for downloading the object.

        Raises:
            MinioObjectNotFound: No object exists at the specified path.
        """
        assert self.client is not None  # required by mypy

        response_headers = response_headers or {
            "Response-Content-Type": "application/octet-stream",
            "Response-Content-Disposition": f"attachment; filename={minio_file_name}",
        }

        try:
            return self.client.presigned_get_object(
                bucket_name,
                minio_file_name,
                expires=expiry_time,
                response_headers=response_headers,
            )
        except Exception:
            raise MinioObjectNotFound()

    def file_exists_at_path(self, bucket_name: str, minio_file_name: str) -> bool:
        """Check whether the file exists in the bucket on the MinIO instance.

        Args:
            bucket_name: The name of the bucket where the check is performed.
            minio_file_name: Path to the object inside the bucket.

        Returns:
            True if file exists at the specified location, False otherwise.
        """
        assert self.client is not None  # required by mypy

        try:
            self.client.stat_object(bucket_name=bucket_name, object_name=minio_file_name)
            return True
        except Exception:
            return False
