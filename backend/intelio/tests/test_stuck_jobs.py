"""Digest and enrichment jobs must always reach a terminal status."""

import json
import tempfile
from pathlib import Path
from unittest.mock import PropertyMock, patch

from django.test import TestCase

from entries.enums import EntryType
from entries.models import EntryClass
from intelio.enums import DigestStatus, EnrichmentStatus
from intelio.models.base import EnricherSettings, EnrichmentRequest
from intelio.models.digest.cradle import CradleDigest
from intelio.models.digest.falcon import FalconDigest
from intelio.tasks.core import run_enricher, start_enrich
from intelio.tasks.cradle import download_file_for_note
from intelio.tasks.falcon import digest_chunk
from user.models import CradleUser


class StuckJobsTestCase(TestCase):
    def setUp(self):
        self.patcher = patch("file_transfer.s3_utils.ensure_cradle_buckets_exist")
        self.patcher.start()
        self.user = CradleUser.objects.create_user(username="user", password="user", email="user@example.com")
        self.tmp = tempfile.TemporaryDirectory()

    def tearDown(self):
        self.tmp.cleanup()
        self.patcher.stop()
        super().tearDown()


class DigestFailureTest(StuckJobsTestCase):
    def run_digest(self, model, digest_type, content: bytes):
        path = Path(self.tmp.name) / "digest"
        path.write_bytes(content)
        digest = model.objects.create(user=self.user, title="d", digest_type=digest_type)
        with (
            patch.object(model, "ensure_local_file"),
            patch.object(model, "path", new_callable=PropertyMock, return_value=str(path)),
        ):
            try:
                digest.digest()
            except Exception:
                pass
        digest.refresh_from_db()
        return digest

    def test_non_utf8_file_is_invalid_json(self):
        for model, digest_type in ((CradleDigest, "CradleDigest"), (FalconDigest, "FalconDigest")):
            with self.subTest(digest_type=digest_type):
                digest = self.run_digest(model, digest_type, b"\xff\xfe\x00garbage")
                self.assertEqual(digest.status, DigestStatus.ERROR)
                self.assertEqual(digest.errors, ["The file contains invalid JSON."])

    def test_unexpected_cradle_structure_ends_in_error(self):
        digest = self.run_digest(CradleDigest, "CradleDigest", json.dumps(["not", "an", "object"]).encode())
        self.assertEqual(digest.status, DigestStatus.ERROR)
        self.assertEqual(digest.errors, ["The file could not be processed."])

    def test_failing_falcon_chunk_ends_in_error(self):
        digest = FalconDigest.objects.create(user=self.user, title="f", digest_type="FalconDigest")
        digest.status = DigestStatus.WORKING
        digest.save(update_fields=["status"])

        with patch.object(FalconDigest, "digest_data", return_value=[123]):
            digest_chunk(digest.id, 0, 1, True)

        digest.refresh_from_db()
        self.assertEqual(digest.status, DigestStatus.ERROR)
        self.assertEqual(digest.errors, ["The file could not be processed."])

    def test_file_for_deleted_note_still_finalizes(self):
        digest = CradleDigest.objects.create(user=self.user, title="c", digest_type="CradleDigest")
        digest.status = DigestStatus.WORKING
        digest.summary = {"files_scheduled": 1, "files_downloaded": 0, "files_failed": 0}
        digest.save(update_fields=["status", "summary"])

        download_file_for_note(
            "00000000-0000-0000-0000-000000000000", "f.txt", "https://example.com/f", "bucket", digest.id
        )

        digest.refresh_from_db()
        self.assertEqual(digest.summary["files_failed"], 1)
        self.assertEqual(digest.status, DigestStatus.WARNING)


class EnrichmentFailureTest(StuckJobsTestCase):
    def setUp(self):
        super().setUp()
        self.ip = EntryClass.objects.create(type=EntryType.ARTIFACT, subtype="ip")
        self.settings = EnricherSettings.objects.create(enricher_type="VirusTotalEnricher", enabled=True)
        self.settings.for_eclasses.add(self.ip)
        self.request = EnrichmentRequest.objects.create(
            title="r", user=self.user, artifact={"entry_class": "ip", "name": "1.1.1.1"}
        )
        self.request.enrichers_settings.add(self.settings)

    @patch("intelio.runner.docker_runner.run_enricher_container")
    def test_artifact_class_no_longer_artifact_ends_in_error(self, container):
        EntryClass.objects.filter(pk="ip").update(type=EntryType.ENTITY)

        run_enricher(self.settings.id, self.request.id)

        container.assert_not_called()
        self.request.refresh_from_db()
        self.assertEqual(self.request.enricher_status, {"VirusTotalEnricher": EnrichmentStatus.ERROR.value})
        self.assertEqual(self.request.status, EnrichmentStatus.ERROR)

    @patch("intelio.tasks.core.group")
    def test_start_with_unavailable_enricher_type_queues_it(self, group):
        EnricherSettings.objects.filter(pk=self.settings.pk).update(enricher_type="RemovedEnricher")

        start_enrich(self.request.id)

        group.assert_called_once()
        self.assertEqual(len(group.call_args.args), 1)

    def test_start_without_enrichers_ends_in_error(self):
        self.request.enrichers_settings.clear()

        start_enrich(self.request.id)

        self.request.refresh_from_db()
        self.assertEqual(self.request.status, EnrichmentStatus.ERROR)
        self.assertIsNotNone(self.request.completed_at)
