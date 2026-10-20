from unittest.mock import patch

from django.test import TestCase


class UserTestCase(TestCase):
    def setUp(self):
        self.patcher = patch("file_transfer.s3_utils.ensure_cradle_buckets_exist")
        self.patcher.start()

    def tearDown(self):
        self.patcher.stop()
