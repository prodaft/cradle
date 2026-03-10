"""Tests for file upload API (initiate presigned URL)."""

from unittest.mock import patch

from django.urls import reverse
from rest_framework_simplejwt.tokens import AccessToken

from user.models import CradleUser

from .utils import FileTransferTestCase


class TestFileUpload(FileTransferTestCase):
    """Tests for GET /file/upload/ (initiate upload)."""

    def setUp(self):
        super().setUp()
        self.patcher = patch("file_transfer.s3_utils.ensure_cradle_buckets_exist")
        self.patcher.start()
        self.user = CradleUser.objects.create_user(username="user", password="user", email="alabala@gmail.com")
        self.user_token = str(AccessToken.for_user(self.user))
        self.headers = {"HTTP_AUTHORIZATION": f"Bearer {self.user_token}"}
        self.file_name = "evidence.png"
        self.file_size = 1024

    def tearDown(self):
        self.patcher.stop()
        super().tearDown()

    def test_initiate_upload_successfully(self):
        """Initiate upload returns presigned URL when fileName and fileSize provided."""
        with patch("file_transfer.views.file_upload_flow") as mock_flow:
            mock_flow.initiate.return_value = {
                "upload_id": "aad5cae6-5737-409d-8ce2-5f116ed5e2de",
                "presigned_url": "https://example.com/put",
                "object_key": "aad5cae6-5737-409d-8ce2-5f116ed5e2de-evidence.png",
                "expires_in": 300,
            }
            response = self.client.get(
                reverse("file_upload"),
                {"fileName": self.file_name, "fileSize": self.file_size},
                **self.headers,
            )
            self.assertEqual(response.status_code, 200)
            self.assertIn("presigned_url", response.json())
            mock_flow.initiate.assert_called_once_with(self.user, self.file_name, self.file_size)

    def test_initiate_upload_not_authenticated(self):
        """Initiate upload returns 401 when not authenticated."""
        response = self.client.get(
            reverse("file_upload"),
            {"fileName": self.file_name, "fileSize": self.file_size},
        )
        self.assertEqual(response.status_code, 401)

    def test_initiate_upload_no_file_name(self):
        """Initiate upload returns 400 when fileName missing."""
        response = self.client.get(
            reverse("file_upload"),
            {"fileSize": self.file_size},
            **self.headers,
        )
        self.assertEqual(response.status_code, 400)

    def test_initiate_upload_no_file_size(self):
        """Initiate upload returns 400 when fileSize missing."""
        response = self.client.get(
            reverse("file_upload"),
            {"fileName": self.file_name},
            **self.headers,
        )
        self.assertEqual(response.status_code, 400)

    def test_initiate_upload_file_name_empty(self):
        """Initiate upload returns 400 when fileName is empty."""
        response = self.client.get(
            reverse("file_upload"),
            {"fileName": "", "fileSize": self.file_size},
            **self.headers,
        )
        self.assertEqual(response.status_code, 400)
