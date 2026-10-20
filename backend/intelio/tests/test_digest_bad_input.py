from unittest.mock import MagicMock, patch

from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from intelio.models.base import BaseDigest
from intelio.models.digest.falcon import FalconDigest
from intelio.models.uploads import PendingDigestUpload
from intelio.serializers import DigestUploadFinalizeCreateSerializer
from user.models import CradleUser, UserRoles
from user.testing import session_access_token


class DigestBadInputTest(TestCase):
    def setUp(self):
        self.patcher = patch("file_transfer.s3_utils.ensure_cradle_buckets_exist")
        self.patcher.start()
        self.client = APIClient()
        self.user = CradleUser.objects.create_user(
            username="admin", password="password", email="a@c.d", role=UserRoles.ADMIN
        )
        self.headers = {"HTTP_COOKIE": f"access_token={session_access_token(self.user)}"}

    def tearDown(self):
        self.patcher.stop()
        super().tearDown()

    def test_finalize_bad_body_is_400(self):
        url = reverse("digest_upload_finalize", kwargs={"upload_id": "00000000-0000-0000-0000-000000000000"})
        for body in ({"title": "t"}, [{"title": "t", "digest_type": "FalconDigest"}]):
            with self.subTest(body=body):
                response = self.client.post(url, body, format="json", **self.headers)
                self.assertEqual(response.status_code, 400, response.content)

    def test_missing_digest_type_reports_field(self):
        serializer = DigestUploadFinalizeCreateSerializer(data={"title": "t"})
        self.assertFalse(serializer.is_valid())
        self.assertEqual(serializer.errors["digest_type"][0].code, "required")

    def test_invalid_digest_type_does_not_leak_into_other_serializers(self):
        DigestUploadFinalizeCreateSerializer(data={"title": "t", "digest_type": "Nope"}).is_valid()

        serializer = DigestUploadFinalizeCreateSerializer(data={"title": "t", "digest_type": "FalconDigest"})
        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertIs(serializer.Meta.model, FalconDigest)
        self.assertIs(DigestUploadFinalizeCreateSerializer.Meta.model, BaseDigest)

    @patch("file_transfer.uploads.tasks.cleanup_expired_upload_generic.apply_async")
    @patch("file_transfer.uploads.flows.presign_client")
    @patch("file_transfer.uploads.flows.PresignedUploadFlow._get_storage", return_value=MagicMock(bucket_name="b"))
    def test_long_file_name_is_truncated(self, _storage, presign, _cleanup):
        presign.return_value.generate_presigned_url.return_value = "http://upload"

        response = self.client.post(
            reverse("digest_upload"),
            {"file_name": "a" * 300 + ".json", "file_size": 10},
            format="json",
            **self.headers,
        )

        self.assertEqual(response.status_code, 201, response.content)
        self.assertLessEqual(len(PendingDigestUpload.objects.get(user=self.user).file_name), 255)
