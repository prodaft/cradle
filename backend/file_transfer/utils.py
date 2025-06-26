import io
from typing import Optional
from minio import Minio
import uuid
from datetime import timedelta
from .exceptions import MinioObjectNotFound
from cradle.settings import MINIO_CONFIG, MINIO_BACKEND_URL
import urllib3


class MinioClient:
    client: Optional[Minio] = None

    def __new__(cls):
        if not hasattr(cls, "_instance"):
            cls._instance = super().__new__(cls)
            if MINIO_BACKEND_URL is not None:
                cls._instance.client = Minio(
                    http_client=urllib3.ProxyManager(MINIO_BACKEND_URL), **MINIO_CONFIG
                )
            else:
                cls._instance.client = Minio(**MINIO_CONFIG)

        return cls._instance

    def create_user_bucket(self, bucket_name: str) -> None:
        """Creates a new Minio bucket with the name bucket_name.

        Args:
            bucket_name: The name of the newly created bucket
        """
        assert self.client is not None  # required by mypy

        self.client.make_bucket(bucket_name)

    def create_presigned_put(
        self,
        bucket_name: str,
        file_name: str,
        expiry_time: timedelta,
    ) -> tuple[str, str]:
        """Generates a Minio object path of the form bucket_name/<minio_file_name>,
        where <minio_file_name> is the concatenation of the provided file name
        with a randomly created uuid. It also generates a presigned put URL that
        allows clients to upload objects at this address. The url expires in the
        specified amount of time.

        Args:
            bucket_name: The name of the bucket where the new path is generated
            file_name: The original name of the file
            expiry_time: Specified the amount of time in which the presigned
            URL expires

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
        """Generates a presigned get URL that allows clients to download objects
        from this address. The url expires in the specified amount of time.

        Args:
            bucket_name: The name of the bucket where the new path is generated
            minio_file_name: The path to the object inside the bucket
            expiry_time: Specified the amount of time in which the presigned
            URL expires

        Returns:
            A tuple containing the newly generated uuid as well as the presigned
            put URL.

        Raises:
            MinioObjectNotFound: There exists no object at the specified path
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
        """Checks whether the file with name minio_file_name exists in the bucket
        called bucket_name on the MinIO instance.

        Args:
            bucket_name: The name of the bucket where the check is performed
            minio_file_name: The path to the object inside the bucket the method
                checks for

        Returns:
            True: If there exists a file at the specified location
            False: If there does not exist a file at the specified location
        """
        assert self.client is not None  # required by mypy

        try:
            self.client.stat_object(
                bucket_name=bucket_name, object_name=minio_file_name
            )
            return True
        except Exception:
            return False

    def fetch_file(self, bucket_name: str, path: str) -> Optional[io.IOBase]:
        """Fetches a file from the MinIO instance.
        Args:
            bucket_name: The name of the bucket where the file is stored
            path: The path to the file inside the bucket

        Returns:
            The file as a byte string
        """

        assert self.client is not None

        try:
            return self.client.get_object(bucket_name, object_name=path)
        except Exception:
            return None

    def list_files(self, bucket_name: str, prefix: str = "") -> list[str]:
        """Lists all files in the specified bucket, optionally filtered by prefix.

        Args:
            bucket_name: The name of the bucket to list files from.
            prefix: Only include objects with keys starting with this prefix.

        Returns:
            A list of object names (file paths) in the bucket.
        """
        assert self.client is not None

        try:
            objects = self.client.list_objects(
                bucket_name, prefix=prefix, recursive=True
            )
            return [obj.object_name for obj in objects]
        except Exception:
            return []

    def delete_files(self, bucket_name: str, file_names: list[str]) -> None:
        """Deletes multiple files from the specified bucket.

        Args:
            bucket_name: The name of the bucket where files will be deleted
            file_names: List of file paths (object names) to delete from the bucket

        Raises:
            MinioObjectNotFound: If any of the specified files don't exist in the bucket
            Exception: For other MinIO-related errors
        """
        assert self.client is not None  # required by mypy

        # First verify all files exist
        for file_name in file_names:
            if not self.file_exists_at_path(bucket_name, file_name):
                raise MinioObjectNotFound(
                    f"File {file_name} not found in bucket {bucket_name}"
                )

        # If all files exist, proceed with deletion
        try:
            # Minio's remove_objects method is more efficient for multiple deletions
            errors = self.client.remove_objects(bucket_name, file_names)
            for error in errors:
                # This should theoretically never happen since we checked existence first,
                # but we handle it just in case
                raise Exception(
                    f"Error deleting object: {error.object_name}, error: {error}"
                )
        except Exception as e:
            # Catch any other MinIO errors
            raise Exception(f"Error deleting files: {str(e)}")
