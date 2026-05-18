"""Tests for file upload API (initiate presigned URL)."""

import uuid
from unittest.mock import patch

from django.urls import reverse
from rest_framework_simplejwt.tokens import AccessToken

from file_transfer.views import file_upload_flow
from user.models import CradleUser

from .utils import FileTransferTestCase


class TestFileUpload(FileTransferTestCase):
    """Tests for GET /file/upload/ (initiate upload)."""

    def setUp(self):
        super().setUp()
        self.patcher = patch("file_transfer.s3_utils.ensure_cradle_buckets_exist")
        self.patcher.start()
        self.user = CradleUser.objects.create_user(
            username="user",
            password="user",
            email="alabala@gmail.com",
            is_active=True,
            email_confirmed=True,
        )
        self.user_token = str(AccessToken.for_user(self.user))
        self.headers = {"HTTP_AUTHORIZATION": f"Bearer {self.user_token}"}
        self.file_name = "evidence.png"
        self.file_size = 1024

    def tearDown(self):
        self.patcher.stop()
        super().tearDown()

    def test_initiate_upload_successfully(self):
        """Initiate upload returns presigned URL when file_name and file_size provided."""
        with patch("file_transfer.views.file_upload_flow") as mock_flow:
            mock_flow.initiate.return_value = {
                "upload_id": "aad5cae6-5737-409d-8ce2-5f116ed5e2de",
                "presigned_url": "https://example.com/put",
                "object_key": "aad5cae6-5737-409d-8ce2-5f116ed5e2de",
                "expires_in": 300,
            }
            response = self.client.get(
                reverse("file_upload"),
                {"file_name": self.file_name, "file_size": self.file_size},
                **self.headers,
            )
            self.assertEqual(response.status_code, 200)
            self.assertIn("presigned_url", response.json())
            mock_flow.initiate.assert_called_once_with(self.user, self.file_name, self.file_size)

    def test_initiate_upload_not_authenticated(self):
        """Initiate upload returns 401 when not authenticated."""
        response = self.client.get(
            reverse("file_upload"),
            {"file_name": self.file_name, "file_size": self.file_size},
        )
        self.assertEqual(response.status_code, 401)

    def test_initiate_upload_no_file_name(self):
        """Initiate upload returns 400 when file_name missing."""
        response = self.client.get(
            reverse("file_upload"),
            {"file_size": self.file_size},
            **self.headers,
        )
        self.assertEqual(response.status_code, 400)

    def test_initiate_upload_no_file_size(self):
        """Initiate upload returns 400 when file_size missing."""
        response = self.client.get(
            reverse("file_upload"),
            {"file_name": self.file_name},
            **self.headers,
        )
        self.assertEqual(response.status_code, 400)

    def test_initiate_upload_file_name_empty(self):
        """Initiate upload returns 400 when file_name is empty."""
        response = self.client.get(
            reverse("file_upload"),
            {"file_name": "", "file_size": self.file_size},
            **self.headers,
        )
        self.assertEqual(response.status_code, 400)

    def test_initiate_upload_invalid_file_size(self):
        """Initiate upload returns 400 when file_size is not a valid integer."""
        response = self.client.get(
            reverse("file_upload"),
            {"file_name": self.file_name, "file_size": "not-a-number"},
            **self.headers,
        )
        self.assertEqual(response.status_code, 400)

    def test_initiate_upload_file_size_zero(self):
        """Initiate upload returns 400 when file_size is zero."""
        response = self.client.get(
            reverse("file_upload"),
            {"file_name": self.file_name, "file_size": "0"},
            **self.headers,
        )
        self.assertEqual(response.status_code, 400)

    def test_file_transfer_object_key_is_short_uuid(self):
        """Object keys must stay short so MinIO/S3 accepts them for very long original names."""
        uid = uuid.uuid4()
        key = file_upload_flow.config.object_key_generator(uid, "a" * 400 + ".txt", self.user)
        self.assertEqual(key, str(uid))
