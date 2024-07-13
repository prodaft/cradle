from django.test import TestEntity
from unittest.mock import patch


class LogsTestEntity(TestEntity):
    def setUp(self):
        self.patcher = patch("file_transfer.utils.MinioClient.create_user_bucket")
        self.mocked_create_user_bucket = self.patcher.start()

    def tearDown(self):
        self.patcher.stop()
