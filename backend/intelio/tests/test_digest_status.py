"""Starting a digest must not overwrite the status set by the background work it queued."""

from unittest.mock import patch

from django.test import TestCase

from intelio.enums import DigestStatus
from intelio.models.base import BaseDigest
from intelio.models.digest.falcon import FalconDigest
from user.models import CradleUser


class DigestStatusTest(TestCase):
    def setUp(self):
        self.patcher = patch("file_transfer.s3_utils.ensure_cradle_buckets_exist")
        self.patcher.start()
        user = CradleUser.objects.create_user(username="user", password="user", email="user@example.com")
        self.digest = FalconDigest.objects.create(user=user, title="falcon", digest_type="FalconDigest")

    def tearDown(self):
        self.patcher.stop()
        super().tearDown()

    def test_keeps_status_set_by_background_work(self):
        def finish_in_background():
            BaseDigest.objects.filter(pk=self.digest.pk).update(status=DigestStatus.DONE)

        with (
            patch.object(FalconDigest, "ensure_local_file"),
            patch.object(FalconDigest, "_digest", side_effect=finish_in_background),
        ):
            self.digest.digest()

        self.digest.refresh_from_db()
        self.assertEqual(self.digest.status, DigestStatus.DONE)

    def test_empty_falcon_digest_finishes(self):
        with (
            patch.object(FalconDigest, "ensure_local_file"),
            patch.object(FalconDigest, "digest_data", return_value=[]),
            patch.object(FalconDigest, "cleanup_local_file"),
        ):
            self.digest.digest()

        self.digest.refresh_from_db()
        self.assertEqual(self.digest.status, DigestStatus.DONE)
