"""Test utilities for the entries app."""

from unittest.mock import patch

from django.test import TestCase

from ..enums import EntryType
from ..models import EntryClass


class EntriesTestCase(TestCase):
    """Base test case with mocked storage bucket creation and sample entry classes."""

    def setUp(self):
        self.patcher = patch("file_transfer.s3_utils.ensure_cradle_buckets_exist")
        self.patcher.start()

        self.entryclass_username = EntryClass.objects.create(type=EntryType.ARTIFACT, subtype="username")
        self.entryclass_password = EntryClass.objects.create(type=EntryType.ARTIFACT, subtype="password")
        self.entryclass1 = EntryClass.objects.create(type=EntryType.ENTITY, subtype="case")

    def tearDown(self):
        self.patcher.stop()
        super().tearDown()
