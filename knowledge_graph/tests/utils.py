from django.test import TestEntity
from unittest.mock import patch
from collections import Counter


class KnowledgeGraphTestEntity(TestEntity):
    def setUp(self):
        self.patcher = patch("file_transfer.utils.MinioClient.create_user_bucket")
        self.mocked_create_user_bucket = self.patcher.start()

    def assertLinksEqual(self, result, expected):
        transformed_result = [tuple(sorted(d.values())) for d in result]
        self.assertEqual(Counter(transformed_result), Counter(expected))

    def tearDown(self):
        self.patcher.stop()
