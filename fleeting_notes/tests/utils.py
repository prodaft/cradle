from django.test import TestCase
from unittest.mock import patch


class FleetingNotesTestCase(TestCase):
    def setUp(self):
        self.patcher = patch("file_transfer.utils.MinioClient.create_user_bucket")
        self.mocked_create_user_bucket = self.patcher.start()

    def tearDown(self):
        self.patcher.stop()
