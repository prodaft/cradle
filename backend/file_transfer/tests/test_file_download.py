"""Tests for file download API (presigned GET URL)."""

from unittest.mock import patch

from django.urls import reverse
from rest_framework_simplejwt.tokens import AccessToken

from file_transfer.models import FileReference
from user.models import CradleUser

from .utils import FileTransferTestCase


class TestFileDownload(FileTransferTestCase):
    """Tests for GET /file/download/ (get presigned download URL)."""

    def setUp(self):
        super().setUp()
        self.patcher = patch("file_transfer.s3_utils.ensure_cradle_buckets_exist")
        self.patcher.start()
        self.user = CradleUser.objects.create_user(username="user", password="user", email="alabala@gmail.com")
        self.user_token = str(AccessToken.for_user(self.user))
        self.headers = {"HTTP_AUTHORIZATION": f"Bearer {self.user_token}"}

    def tearDown(self):
        self.patcher.stop()
        super().tearDown()

    def test_download_successfully(self):
        """Download returns presigned URL when fileId is valid and user has access."""
        file_ref = FileReference.objects.create(
            file_name="evidence.png",
            user=self.user,
        )
        FileReference.objects.filter(pk=file_ref.pk).update(file=f"{file_ref.id}-evidence.png")
        file_ref.refresh_from_db()

        with patch("file_transfer.views.presign_get", return_value="https://example.com/download"):
            response = self.client.get(
                reverse("file_download"),
                {"fileId": str(file_ref.id)},
                **self.headers,
            )
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.json()["presigned_url"], "https://example.com/download")

    def test_download_not_authenticated(self):
        """Download returns 401 when not authenticated."""
        response = self.client.get(
            reverse("file_download"),
            {"fileId": "aad5cae6-5737-409d-8ce2-5f116ed5e2de"},
        )
        self.assertEqual(response.status_code, 401)

    def test_download_no_file_id(self):
        """Download returns 400 when fileId missing."""
        response = self.client.get(reverse("file_download"), **self.headers)
        self.assertEqual(response.status_code, 400)

    def test_download_invalid_file_id(self):
        """Download returns 400 when fileId is not a valid UUID."""
        response = self.client.get(
            reverse("file_download"),
            {"fileId": "not-a-uuid"},
            **self.headers,
        )
        self.assertEqual(response.status_code, 400)

    def test_download_file_not_found(self):
        """Download returns 404 when FileReference does not exist."""
        import uuid

        response = self.client.get(
            reverse("file_download"),
            {"fileId": str(uuid.uuid4())},
            **self.headers,
        )
        self.assertEqual(response.status_code, 404)
