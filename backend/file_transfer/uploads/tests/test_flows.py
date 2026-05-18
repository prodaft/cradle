"""Tests for PresignedUploadFlow."""

import uuid
from datetime import timedelta
from unittest.mock import MagicMock, patch

from django.test import TestCase
from django.utils import timezone

from file_transfer.models import PendingUpload
from file_transfer.uploads.flows import PresignedUploadFlow, UploadConfig
from user.models import CradleUser


class PresignedUploadFinalizeCleanupTests(TestCase):
    """When finalize callback fails, pending row and storage object must be released."""

    def setUp(self):
        self.user = CradleUser.objects.create_user(
            username="flow_u1",
            email="flow_u1@example.com",
            password="test-pass-123",
            is_active=True,
            email_confirmed=True,
        )
        self.callbacks = MagicMock()
        self.flow = PresignedUploadFlow(
            UploadConfig(bucket_name="cradle-files"),
            PendingUpload,
            self.callbacks,
        )
        self.upload_id = uuid.uuid4()
        PendingUpload.objects.create(
            id=self.upload_id,
            object_key=str(self.upload_id),
            file_name="doc.txt",
            user=self.user,
            expires_at=timezone.now() + timedelta(minutes=10),
        )

    @patch("file_transfer.uploads.flows.exists", return_value=True)
    @patch("file_transfer.uploads.flows.delete_object")
    def test_finalize_removes_pending_when_callback_fails(self, mock_delete, _mock_exists):
        self.callbacks.on_finalize_success.side_effect = ValueError("callback boom")

        with self.assertRaises(ValueError):
            self.flow.finalize(self.upload_id, self.user)

        self.assertFalse(PendingUpload.objects.filter(pk=self.upload_id).exists())
        mock_delete.assert_called_once_with("cradle-files", str(self.upload_id))


class PresignedUploadInitiatePresignTests(TestCase):
    """If presign fails after creating PendingUpload, the row must not be left behind."""

    def setUp(self):
        self.user = CradleUser.objects.create_user(
            username="flow_u2",
            email="flow_u2@example.com",
            password="test-pass-123",
            is_active=True,
            email_confirmed=True,
        )
        self.callbacks = MagicMock()
        self.flow = PresignedUploadFlow(
            UploadConfig(bucket_name="cradle-files"),
            PendingUpload,
            self.callbacks,
        )

    @patch("file_transfer.uploads.tasks.cleanup_expired_upload_generic.apply_async")
    @patch.object(PresignedUploadFlow, "_get_storage")
    def test_initiate_removes_pending_when_presign_fails(self, mock_get_storage, _mock_celery):
        mock_storage = MagicMock()
        mock_storage.bucket_name = "cradle-files"
        mock_storage.connection.meta.client.generate_presigned_url.side_effect = RuntimeError("presign failed")
        mock_get_storage.return_value = mock_storage

        with self.assertRaises(RuntimeError):
            self.flow.initiate(self.user, "ok.txt", 1024)

        self.assertEqual(PendingUpload.objects.filter(user=self.user).count(), 0)
