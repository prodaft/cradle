"""Tests for EntryClass.rename."""

from unittest.mock import patch

from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken

from user.models import CradleUser, UserRoles

from ..enums import EntryType
from ..exceptions import EntryTypeRequiredException, InvalidEntryTypeSettingsException
from ..models import Entry, EntryClass
from .utils import EntriesTestCase


class EntryClassRenameTestCase(TestCase):
    def setUp(self):
        self.patcher = patch("file_transfer.s3_utils.ensure_cradle_buckets_exist")
        self.patcher.start()
        self.remap_patcher = patch("entries.tasks.remap_notes_task.delay")
        self.remap_patcher.start()

    def tearDown(self):
        self.patcher.stop()
        self.remap_patcher.stop()
        super().tearDown()

    def test_rename_updates_subtype_without_duplicating(self):
        entry_class = EntryClass.objects.create(
            type=EntryType.ARTIFACT,
            subtype="PTI",
            description="Original description",
            color="#ff0000",
        )
        child = EntryClass.objects.create(type=EntryType.ARTIFACT, subtype="child-type")
        entry_class.children.add(child)

        entry = Entry.objects.create(name="example", entry_class=entry_class)

        renamed = entry_class.rename("renamed-pti")

        self.assertEqual(renamed.subtype, "renamed-pti")
        self.assertFalse(EntryClass.objects.filter(subtype="PTI").exists())
        self.assertTrue(EntryClass.objects.filter(subtype="renamed-pti").exists())
        self.assertEqual(EntryClass.objects.count(), 2)

        renamed.refresh_from_db()
        self.assertEqual(renamed.description, "Original description")
        self.assertEqual(renamed.color, "#ff0000")
        self.assertIn(child, renamed.children.all())

        entry.refresh_from_db()
        self.assertEqual(entry.entry_class_id, "renamed-pti")

    def test_rename_same_subtype_returns_self(self):
        entry_class = EntryClass.objects.create(type=EntryType.ARTIFACT, subtype="PTI")
        result = entry_class.rename("PTI")
        self.assertIs(result, entry_class)
        self.assertEqual(EntryClass.objects.filter(subtype="PTI").count(), 1)

    def test_rename_strips_slashes_and_whitespace(self):
        entry_class = EntryClass.objects.create(type=EntryType.ARTIFACT, subtype="PTI")
        renamed = entry_class.rename(" /new-name/ ")
        self.assertEqual(renamed.subtype, "new-name")

    def test_rename_rejects_empty_name(self):
        entry_class = EntryClass.objects.create(type=EntryType.ARTIFACT, subtype="PTI")
        with self.assertRaises(EntryTypeRequiredException):
            entry_class.rename("   ")

    def test_rename_rejects_duplicate_target_name(self):
        EntryClass.objects.create(type=EntryType.ARTIFACT, subtype="PTI")
        other = EntryClass.objects.create(type=EntryType.ARTIFACT, subtype="taken")
        with self.assertRaises(InvalidEntryTypeSettingsException):
            other.rename("PTI")


class EntryClassRenameAPITestCase(EntriesTestCase):
    def setUp(self):
        super().setUp()
        self.client = APIClient()
        self.manager = CradleUser.objects.create_user(
            username="entrymgr",
            password="password",
            role=UserRoles.MANAGER,
            email="entrymgr@example.com",
            is_active=True,
        )
        self.headers = {"HTTP_AUTHORIZATION": f"Bearer {AccessToken.for_user(self.manager)}"}
        self.entry_class = EntryClass.objects.create(
            type=EntryType.ARTIFACT,
            subtype="PTI",
            description="Original description",
            color="#ff0000",
        )
        self.remap_patcher = patch("entries.tasks.remap_notes_task.delay")
        self.remap_patcher.start()

    def tearDown(self):
        self.remap_patcher.stop()
        super().tearDown()

    def test_update_entry_class_name_via_api(self):
        payload = {
            "type": "artifact",
            "subtype": "renamed-pti",
            "description": "Updated description",
            "color": "#00ff00",
            "prefix": "",
            "regex": "",
            "options": [],
            "generative_regex": "",
            "format": None,
            "children": [],
        }
        response = self.client.put(
            reverse("entry_class_detail", kwargs={"class_subtype": "PTI"}),
            payload,
            format="json",
            **self.headers,
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["subtype"], "renamed-pti")
        self.assertFalse(EntryClass.objects.filter(subtype="PTI").exists())
        self.assertTrue(EntryClass.objects.filter(subtype="renamed-pti").exists())
        self.assertEqual(EntryClass.objects.count(), 4)
