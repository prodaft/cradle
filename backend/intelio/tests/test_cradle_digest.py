"""Tests for importing entry classes from CRADLE JSON reports."""

import json
import tempfile
from pathlib import Path
from unittest.mock import PropertyMock, patch

from django.test import TestCase

from entries.enums import EntryType
from entries.models import Entry, EntryClass
from entries.serializers import EntryClassSerializerNoTeams
from intelio.models.digest.cradle import CradleDigest
from user.models import CradleUser, UserRoles


class CradleDigestEntryClassImportTest(TestCase):
    def setUp(self):
        self.patcher = patch("file_transfer.s3_utils.ensure_all_buckets_exist")
        self.patcher.start()
        self.user = CradleUser.objects.create_user(
            username="user", password="user", email="user@example.com", role=UserRoles.MANAGER
        )
        self.tmp = tempfile.TemporaryDirectory()

    def tearDown(self):
        self.tmp.cleanup()
        self.patcher.stop()
        super().tearDown()

    def import_report(self, report):
        path = Path(self.tmp.name) / "report.json"
        path.write_text(json.dumps(report))
        digest = CradleDigest.objects.create(user=self.user, title="report", digest_type="CradleDigest")
        with (
            patch.object(CradleDigest, "ensure_local_file"),
            patch.object(CradleDigest, "path", new_callable=PropertyMock, return_value=str(path)),
            patch.object(CradleDigest, "finalize"),
        ):
            digest._digest()
        digest.refresh_from_db()
        self.assertEqual(digest.errors, [])
        return digest

    def test_imports_options_exported_as_list(self):
        exported = EntryClass(type=EntryType.ARTIFACT, subtype="tlp", options="red\namber")
        report = {"entry_classes": EntryClassSerializerNoTeams([exported], many=True).data}
        self.assertEqual(report["entry_classes"][0]["options"], ["red", "amber"])

        self.import_report(report)

        self.assertEqual(EntryClass.objects.get(subtype="tlp").options, "red\namber")

    def test_imports_options_from_older_reports(self):
        self.import_report({"entry_classes": [{"type": "artifact", "subtype": "tlp", "options": "red\namber"}]})

        self.assertEqual(EntryClass.objects.get(subtype="tlp").options, "red\namber")

    def test_only_managers_create_entry_types(self):
        self.user.role = UserRoles.USER
        self.user.save()

        digest = self.import_report({"entry_classes": [{"type": "entity", "subtype": "case"}]})

        self.assertFalse(EntryClass.objects.filter(subtype="case").exists())
        self.assertEqual(len(digest.warnings), 1)

    def test_internal_entry_types_are_not_created(self):
        self.import_report({"entry_classes": [{"type": "entity", "subtype": "enrichment"}]})

        self.assertFalse(EntryClass.objects.filter(subtype="enrichment").exists())

    def test_only_admins_create_entities(self):
        report = {
            "entry_classes": [{"type": "entity", "subtype": "case"}],
            "entries": [{"subtype": "case", "name": "APT-29"}],
        }
        digest = self.import_report(report)
        self.assertFalse(Entry.objects.filter(name="APT-29").exists())
        self.assertEqual(len(digest.warnings), 1)

        self.user.role = UserRoles.ADMIN
        self.user.save()
        self.import_report(report)
        self.assertTrue(Entry.objects.filter(name="APT-29").exists())
