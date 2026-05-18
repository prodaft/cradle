"""Tests for file download API (presigned GET URL)."""

import uuid
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
        self.user = CradleUser.objects.create_user(
            username="user",
            password="user",
            email="alabala@gmail.com",
            is_active=True,
            email_confirmed=True,
        )
        self.user_token = str(AccessToken.for_user(self.user))
        self.headers = {"HTTP_AUTHORIZATION": f"Bearer {self.user_token}"}

    def tearDown(self):
        self.patcher.stop()
        super().tearDown()

    def test_download_successfully(self):
        """Download returns presigned URL when file_id is valid and user has access."""
        file_ref = FileReference.objects.create(
            file_name="evidence.png",
            user=self.user,
        )
        FileReference.objects.filter(pk=file_ref.pk).update(file=str(file_ref.id))
        file_ref.refresh_from_db()

        with patch("file_transfer.views.presign_get", return_value="https://example.com/download"):
            response = self.client.get(
                reverse("file_download"),
                {"file_id": str(file_ref.id)},
                **self.headers,
            )
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.json()["presigned_url"], "https://example.com/download")

    def test_download_not_authenticated(self):
        """Download returns 401 when not authenticated."""
        response = self.client.get(
            reverse("file_download"),
            {"file_id": "aad5cae6-5737-409d-8ce2-5f116ed5e2de"},
        )
        self.assertEqual(response.status_code, 401)

    def test_download_no_file_id(self):
        """Download returns 400 when file_id missing."""
        response = self.client.get(reverse("file_download"), **self.headers)
        self.assertEqual(response.status_code, 400)

    def test_download_invalid_file_id(self):
        """Download returns 400 when file_id is not a valid UUID."""
        response = self.client.get(
            reverse("file_download"),
            {"file_id": "not-a-uuid"},
            **self.headers,
        )
        self.assertEqual(response.status_code, 400)

    def test_download_file_not_found(self):
        """Download returns 404 when FileReference does not exist."""
        response = self.client.get(
            reverse("file_download"),
            {"file_id": str(uuid.uuid4())},
            **self.headers,
        )
        self.assertEqual(response.status_code, 404)

    def test_download_access_denied(self):
        """Download returns 403 when user does not have access to the file."""
        other_user = CradleUser.objects.create_user(
            username="other",
            password="other",
            email="other@gmail.com",
            is_active=True,
            email_confirmed=True,
        )
        file_ref = FileReference.objects.create(
            file_name="private.png",
            user=other_user,
        )
        FileReference.objects.filter(pk=file_ref.pk).update(file=str(file_ref.id))

        response = self.client.get(
            reverse("file_download"),
            {"file_id": str(file_ref.id)},
            **self.headers,
        )
        self.assertEqual(response.status_code, 403)

    def test_download_file_not_in_storage(self):
        """Download returns 404 when FileReference exists but file is not in storage."""
        file_ref = FileReference.objects.create(
            file_name="orphan.png",
            user=self.user,
        )
        # file field left empty (no object in storage)

        response = self.client.get(
            reverse("file_download"),
            {"file_id": str(file_ref.id)},
            **self.headers,
        )
        self.assertEqual(response.status_code, 404)
