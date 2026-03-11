"""Test utilities for file transfer: MinIO client mocks and shared fixtures."""

from datetime import timedelta
from unittest.mock import patch

from django.test import TestCase


class FileTransferTestCase(TestCase):
    """Base test case with MinIO client mocking helpers."""

    def setUp(self):
        """Set up test fixtures."""
        pass

    def tearDown(self):
        """Tear down test fixtures."""
        pass

    def init_minio_constants(self):
        """Initialize sample file name, expiry, presigned URL, and UUID for tests."""
        self.file_name = "evidence.png"
        self.expiry_time = timedelta(minutes=5)
        self.minio_file_name = "aad5cae6-5737-409d-8ce2-5f116ed5e2de-evidence.png"
        self.presigned_url = (
            "http://127.0.0.1:9000/user/aad5cae6-5737-409d-8ce2-5f116ed5e2de"
            "-evidence.png?"
            "X-Amz-Algorithm=AWS4-HMAC-SHA256&"
            "X-Amz-Credential=minioadmin%2F20240603%2Fus-east-1%2Fs3%2Faws4_request&"
            "X-Amz-Date=20240603T131058Z&"
            "X-Amz-Expires=300&"
            "X-Amz-SignedHeaders=host&"
            "X-Amz-Signature=f06e8fe9c09017d64e2704e243deafec42ecd44a177c5a2e41e"
            "be40d57a372a8"
        )
        self.uuid = "aad5cae6-5737-409d-8ce2-5f116ed5e2de"

    def mock_minio_create(self):
        """Patch minio.Minio directly for low-level tests."""
        self.init_minio_constants()

        self.patcher_bucket = patch("minio.Minio.make_bucket")
        self.patcher_put = patch("minio.Minio.presigned_put_object")
        self.patcher_get = patch("minio.Minio.presigned_get_object")
        self.patcher_stat_object = patch("minio.Minio.stat_object")
        self.patcher_uuid = patch("uuid.uuid4")

        self.mocked_make_bucket = self.patcher_bucket.start()
        self.mocked_presigned_put = self.patcher_put.start()
        self.mocked_presigned_get = self.patcher_get.start()
        self.mocked_stat_object = self.patcher_stat_object.start()
        self.mocked_uuid = self.patcher_uuid.start()

        self.mocked_presigned_put.return_value = self.presigned_url
        self.mocked_uuid.return_value = self.uuid

        def mocked_presigned_get_call(bucket_name, minio_file_name, *args, **kwargs):
            if bucket_name == self.bucket_name and minio_file_name == self.minio_file_name:
                return self.presigned_url
            else:
                raise Exception()

        def mocked_stat_object_call(bucket_name, object_name):
            if bucket_name == self.bucket_name and object_name == self.minio_file_name:
                return True
            else:
                raise Exception()

        self.mocked_presigned_get.side_effect = mocked_presigned_get_call
        self.mocked_stat_object.side_effect = mocked_stat_object_call

    def mock_minio_destroy(self):
        """Stop minio.Minio patches started by mock_minio_create."""
        self.patcher_put.stop()
        self.patcher_get.stop()
        self.patcher_bucket.stop()
        self.patcher_stat_object.stop()
        self.patcher_uuid.stop()
