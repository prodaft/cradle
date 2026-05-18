from unittest.mock import patch

from django.test import TestCase

from entries.enums import EntryType
from entries.models import EntryClass


class AccessTestCase(TestCase):
    def setUp(self):
        self.patcher = patch("file_transfer.s3_utils.ensure_cradle_buckets_exist")
        self.patcher.start()

        self.entryclass1 = EntryClass.objects.create(type=EntryType.ENTITY, subtype="case")

    def tearDown(self):
        self.patcher.stop()
        super().tearDown()
