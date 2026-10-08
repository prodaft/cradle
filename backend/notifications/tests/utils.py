"""Test utilities for notification tests."""

from unittest.mock import patch

from django.test import TestCase

from entries.enums import EntryType
from entries.models import EntryClass


class NotificationsTestCase(TestCase):
    """Base test case with mocked storage bucket creation and sample EntryClasses."""

    def setUp(self):
        """Create mocks and sample EntryClass for notification tests."""
        self.patcher = patch("file_transfer.s3_utils.ensure_cradle_buckets_exist")
        self.patcher.start()

        self.entryclass1 = EntryClass.objects.create(type=EntryType.ENTITY, subtype="case")

    def tearDown(self):
        """Stop all patchers."""
        self.patcher.stop()
