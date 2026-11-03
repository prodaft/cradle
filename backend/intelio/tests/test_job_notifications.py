"""Digest and enrichment owners hear how their job ended, including when it never got going or got stuck."""

from datetime import timedelta
from unittest.mock import patch

from django.test import TestCase
from django.utils import timezone

from entries.enums import EntryType
from entries.models import EntryClass
from intelio.enums import EnrichmentStatus
from intelio.models.base import EnricherSettings, EnrichmentRequest
from intelio.models.digest.cradle import CradleDigest
from intelio.tasks.core import fail_stuck_enrichments, start_enrich
from notifications.models import (
    DigestCompleteNotification,
    DigestErrorNotification,
    EnrichmentCompleteNotification,
    EnrichmentErrorNotification,
)
from user.models import CradleUser


class JobNotificationTestCase(TestCase):
    def setUp(self):
        self.patcher = patch("file_transfer.s3_utils.ensure_all_buckets_exist")
        self.patcher.start()
        self.user = CradleUser.objects.create_user(username="user", password="user", email="user@example.com")

    def tearDown(self):
        self.patcher.stop()
        super().tearDown()


class DigestNotificationTest(JobNotificationTestCase):
    def setUp(self):
        super().setUp()
        self.digest = CradleDigest.objects.create(user=self.user, title="weekly", digest_type="CradleDigest")

    def test_failed_digest_notifies(self):
        with self.captureOnCommitCallbacks(execute=True):
            self.digest.mark_error("The file contains invalid JSON.")

        notification = DigestErrorNotification.objects.get(user=self.user)
        self.assertEqual(notification.digest_id, self.digest.id)
        self.assertEqual(notification.message, 'Your digest "weekly" failed.')

    def test_finished_digest_notifies(self):
        with self.captureOnCommitCallbacks(execute=True):
            self.digest.finalize()

        self.assertEqual(
            [n.message for n in DigestCompleteNotification.objects.filter(user=self.user)],
            ['Your digest "weekly" is complete.'],
        )

    def test_digest_with_warnings_says_so(self):
        self.digest.warnings = ["1 file could not be downloaded."]
        with self.captureOnCommitCallbacks(execute=True):
            self.digest.finalize()

        self.assertEqual(
            DigestCompleteNotification.objects.get(user=self.user).message,
            'Your digest "weekly" finished with warnings.',
        )


class EnrichmentNotificationTest(JobNotificationTestCase):
    def setUp(self):
        super().setUp()
        self.ip = EntryClass.objects.create(type=EntryType.ARTIFACT, subtype="ip")
        self.request = EnrichmentRequest.objects.create(
            title="r", user=self.user, artifact={"entry_class": "ip", "name": "1.1.1.1"}
        )

    def test_request_without_enrichers_notifies_the_error(self):
        start_enrich(self.request.id)

        self.request.refresh_from_db()
        self.assertEqual(self.request.status, EnrichmentStatus.ERROR)
        self.assertTrue(EnrichmentErrorNotification.objects.filter(user=self.user).exists())

    def test_stuck_request_is_failed_and_notified(self):
        settings = EnricherSettings.objects.create(enricher_type="VirusTotalEnricher", enabled=True)
        self.request.enrichers_settings.add(settings)
        EnrichmentRequest.objects.filter(pk=self.request.pk).update(
            status=EnrichmentStatus.WORKING, started_at=timezone.now() - timedelta(hours=1)
        )

        fail_stuck_enrichments()

        self.request.refresh_from_db()
        self.assertEqual(self.request.status, EnrichmentStatus.ERROR)
        self.assertIsNotNone(self.request.completed_at)
        self.assertTrue(EnrichmentErrorNotification.objects.filter(user=self.user).exists())

    def test_recent_request_is_left_running(self):
        settings = EnricherSettings.objects.create(enricher_type="VirusTotalEnricher", enabled=True)
        self.request.enrichers_settings.add(settings)
        EnrichmentRequest.objects.filter(pk=self.request.pk).update(
            status=EnrichmentStatus.WORKING, started_at=timezone.now()
        )

        fail_stuck_enrichments()

        self.request.refresh_from_db()
        self.assertEqual(self.request.status, EnrichmentStatus.WORKING)
        self.assertFalse(EnrichmentErrorNotification.objects.exists())

    def test_late_report_after_the_sweep_does_not_reopen_or_renotify(self):
        settings = EnricherSettings.objects.create(enricher_type="VirusTotalEnricher", enabled=True)
        self.request.enrichers_settings.add(settings)
        EnrichmentRequest.objects.filter(pk=self.request.pk).update(
            status=EnrichmentStatus.WORKING, started_at=timezone.now() - timedelta(hours=1)
        )
        fail_stuck_enrichments()

        self.request.refresh_from_db()
        self.request.set_enricher_status("VirusTotalEnricher", EnrichmentStatus.DONE)

        self.request.refresh_from_db()
        self.assertEqual(self.request.status, EnrichmentStatus.ERROR)
        self.assertEqual(EnrichmentErrorNotification.objects.filter(user=self.user).count(), 1)
        self.assertFalse(EnrichmentCompleteNotification.objects.exists())
