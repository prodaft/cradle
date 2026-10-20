"""Tests for the list representation of EntryClass.options."""

from unittest.mock import patch

from django.test import TestCase

from ..enums import EntryType
from ..models import EntryClass
from ..serializers import EntryClassSerializer, EntryClassSerializerNoChildren, EntrySerializer


class EntryClassOptionsTest(TestCase):
    def setUp(self):
        self.patcher = patch("file_transfer.s3_utils.ensure_cradle_buckets_exist")
        self.patcher.start()

    def tearDown(self):
        self.patcher.stop()
        super().tearDown()

    def test_options_are_returned_as_list(self):
        entry_class = EntryClass.objects.create(type=EntryType.ARTIFACT, subtype="tlp", options="red\namber\ngreen")

        self.assertEqual(EntryClassSerializerNoChildren(entry_class).data["options"], ["red", "amber", "green"])
        self.assertEqual(EntryClassSerializer(entry_class).data["options"], ["red", "amber", "green"])

    def test_empty_options_are_returned_as_empty_list(self):
        entry_class = EntryClass.objects.create(type=EntryType.ARTIFACT, subtype="ip")

        self.assertEqual(EntryClassSerializerNoChildren(entry_class).data["options"], [])

    def test_flattened_entry_includes_options_list(self):
        entry_class = EntryClass.objects.create(type=EntryType.ARTIFACT, subtype="tlp", options="red\ngreen")
        entry = entry_class.entries.create(name="red")

        self.assertEqual(EntrySerializer(entry).data["options"], ["red", "green"])

    def test_options_list_is_stored_newline_separated(self):
        serializer = EntryClassSerializer(
            data={"type": "artifact", "subtype": "tlp", "format": None, "options": [" red ", "", "amber"]}
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        entry_class = serializer.save()
        entry_class.refresh_from_db()
        self.assertEqual(entry_class.options, "red\namber")

    def test_options_reject_line_breaks(self):
        serializer = EntryClassSerializer(
            data={"type": "artifact", "subtype": "tlp", "format": None, "options": ["red\namber"]}
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("options", serializer.errors)

    def test_options_reject_string(self):
        serializer = EntryClassSerializer(
            data={"type": "artifact", "subtype": "tlp", "format": None, "options": "red\namber"}
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("options", serializer.errors)
