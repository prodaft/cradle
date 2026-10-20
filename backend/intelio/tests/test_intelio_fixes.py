"""Enrichment restart guard, multipart digest type and enricher settings PATCH."""

from datetime import timedelta
from unittest.mock import patch

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from entries.enums import EntryType
from entries.models import EntryClass
from intelio.models.base import BaseDigest, EnricherSettings, EnrichmentRequest
from intelio.models.digest.falcon import FalconDigest
from user.models import CradleUser, UserRoles
from user.testing import session_access_token


class IntelioTestCase(TestCase):
    def setUp(self):
        self.patcher = patch("file_transfer.s3_utils.ensure_cradle_buckets_exist")
        self.patcher.start()
        self.client = APIClient()
        self.admin = CradleUser.objects.create_user(
            username="admin", password="pw", email="a@c.d", role=UserRoles.ADMIN
        )
        self.headers = {"HTTP_COOKIE": f"access_token={session_access_token(self.admin)}"}
        self.ip = EntryClass.objects.create(type=EntryType.ARTIFACT, subtype="ip")

    def tearDown(self):
        self.patcher.stop()
        super().tearDown()


@patch("intelio.tasks.start_enrich.apply_async")
class EnrichmentRestartTest(IntelioTestCase):
    def setUp(self):
        super().setUp()
        settings = EnricherSettings.objects.create(enricher_type="VirusTotalEnricher", enabled=True)
        settings.for_eclasses.add(self.ip)
        self.request = EnrichmentRequest.objects.create(
            title="r", user=self.admin, artifact={"entry_class": "ip", "name": "1.1.1.1"}
        )
        self.request.enrichers_settings.add(settings)
        self.url = reverse("enrichment_restart", kwargs={"enrichment_id": self.request.id})

    def restart(self, **state):
        EnrichmentRequest.objects.filter(pk=self.request.pk).update(**state)
        with self.captureOnCommitCallbacks(execute=True):
            return self.client.post(self.url, **self.headers)

    def test_running_request_cannot_restart(self, start):
        response = self.restart(completed_at=None, started_at=timezone.now())

        self.assertEqual(response.status_code, 409, response.content)
        self.assertEqual(response.json()["code"], "ENRICHMENT_RUNNING")
        start.assert_not_called()

    def test_finished_or_stuck_request_restarts(self, start):
        for state in (
            {"completed_at": timezone.now(), "started_at": timezone.now()},
            {"completed_at": None, "started_at": timezone.now() - timedelta(hours=1)},
        ):
            with self.subTest(state=state):
                start.reset_mock()
                response = self.restart(**state)

                self.assertEqual(response.status_code, 200, response.content)
                start.assert_called_once()
                self.request.refresh_from_db()
                self.assertIsNotNone(self.request.started_at)


class MultipartDigestTest(IntelioTestCase):
    @patch("intelio.views.digest.start_digest.delay")
    @patch("file_transfer.storage.DigestStorage.save", side_effect=lambda name, content, max_length=None: name)
    def test_digest_is_created_as_its_subclass(self, _save, _start):
        response = self.client.post(
            reverse("digest_list"),
            {"title": "f", "digest_type": "FalconDigest", "file": SimpleUploadedFile("f.json", b"[]")},
            format="multipart",
            **self.headers,
        )

        self.assertEqual(response.status_code, 201, response.content)
        self.assertEqual(response.json()["display_name"], FalconDigest.display_name)
        digest = BaseDigest.objects.get(id=response.json()["id"])
        self.assertEqual(digest.digest_type, "FalconDigest")
        self.assertTrue(digest.file.name)


class EnricherSettingsPatchTest(IntelioTestCase):
    def test_patch_without_classes_keeps_them(self):
        settings = EnricherSettings.objects.create(enricher_type="VirusTotalEnricher", enabled=False)
        settings.for_eclasses.add(self.ip)

        response = self.client.patch(
            reverse("enrichment_schema", kwargs={"enricher_type": "VirusTotalEnricher"}),
            {"enabled": True},
            format="json",
            **self.headers,
        )

        self.assertEqual(response.status_code, 200, response.content)
        settings.refresh_from_db()
        self.assertTrue(settings.enabled)
        self.assertEqual(list(settings.for_eclasses.all()), [self.ip])
