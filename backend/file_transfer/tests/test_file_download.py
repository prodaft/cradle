"""Tests for file download API (presigned GET URL)."""

import uuid
from unittest.mock import patch

from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from django.utils.dateparse import parse_datetime

from file_transfer.constants import FILE_TRANSFER_PRESIGNED_DOWNLOAD_EXPIRY_SECONDS
from file_transfer.models import FileReference
from user.models import CradleUser
from user.testing import session_access_token


class TestFileDownload(TestCase):
    """Tests for /files/<id>/ download, process and delete."""

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
        self.user_token = str(session_access_token(self.user))
        self.headers = {"HTTP_COOKIE": f"access_token={self.user_token}"}

    def tearDown(self):
        self.patcher.stop()
        super().tearDown()

    def private_file(self, owner, name="private.png"):
        file_ref = FileReference.objects.create(file_name=name, user=owner)
        FileReference.objects.filter(pk=file_ref.pk).update(file=str(file_ref.id))
        file_ref.refresh_from_db()
        return file_ref

    def other_user(self):
        return CradleUser.objects.create_user(
            username="other", password="other", email="other@gmail.com", is_active=True, email_confirmed=True
        )

    def test_download_successfully(self):
        """Download returns presigned URL when the user has access."""
        file_ref = self.private_file(self.user, "evidence.png")

        with patch("file_transfer.models.presign_get", return_value="https://example.com/download"):
            response = self.client.get(reverse("file_download", kwargs={"file_id": file_ref.id}), **self.headers)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["presigned_url"], "https://example.com/download")
        expires_at = parse_datetime(response.json()["expires_at"])
        remaining = (expires_at - timezone.now()).total_seconds()
        self.assertTrue(0 < remaining <= FILE_TRANSFER_PRESIGNED_DOWNLOAD_EXPIRY_SECONDS)

    def test_download_url_sanitizes_attachment_name(self):
        """A quote in the stored name must not break out of the Content-Disposition filename."""
        file_ref = self.private_file(self.user, 'evil".png')

        with patch("file_transfer.models.presign_get", return_value="https://example.com/download") as presign:
            file_ref.download_url(expires_in=60)

        self.assertEqual(presign.call_args.kwargs["response_content_disposition"], 'attachment; filename="evil_.png"')

    def test_download_not_authenticated(self):
        response = self.client.get(reverse("file_download", kwargs={"file_id": uuid.uuid4()}))
        self.assertEqual(response.status_code, 401)

    def test_download_file_not_found(self):
        response = self.client.get(reverse("file_download", kwargs={"file_id": uuid.uuid4()}), **self.headers)
        self.assertEqual(response.status_code, 404)

    def test_unreadable_file_is_404_like_a_missing_one(self):
        """Files the user cannot read must not be told apart from missing ones."""
        file_ref = self.private_file(self.other_user())

        for name, method in (("file_download", "get"), ("file_process", "post"), ("file_detail", "delete")):
            with self.subTest(name=name):
                response = getattr(self.client, method)(reverse(name, kwargs={"file_id": file_ref.id}), **self.headers)
                self.assertEqual(response.status_code, 404)
                self.assertEqual(response.json()["code"], "FILE_REFERENCE_NOT_FOUND")

    def test_download_file_not_in_storage(self):
        """Download returns 404 when FileReference exists but file is not in storage."""
        file_ref = FileReference.objects.create(file_name="orphan.png", user=self.user)

        response = self.client.get(reverse("file_download", kwargs={"file_id": file_ref.id}), **self.headers)
        self.assertEqual(response.status_code, 404)

    def test_owner_deletes_file(self):
        file_ref = self.private_file(self.user)

        with patch("django.db.models.fields.files.FieldFile.delete"):
            response = self.client.delete(reverse("file_detail", kwargs={"file_id": file_ref.id}), **self.headers)

        self.assertEqual(response.status_code, 204)
        self.assertFalse(FileReference.objects.filter(pk=file_ref.pk).exists())

    def test_process_queues_processing(self):
        file_ref = self.private_file(self.user)

        with patch.object(FileReference, "process_file") as process:
            response = self.client.post(reverse("file_process", kwargs={"file_id": file_ref.id}), **self.headers)

        self.assertEqual(response.status_code, 202)
        process.assert_called_once()
