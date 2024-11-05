from django.test import TestCase
from unittest.mock import patch

from entries.enums import EntryType
from entries.models import EntryClass


class AccessTestCase(TestCase):
    def setUp(self):
        self.patcher = patch("file_transfer.utils.MinioClient.create_user_bucket")
        self.mocked_create_user_bucket = self.patcher.start()

        self.success_logger_patcher = patch("logs.utils.success_logger")
        self.error_logger_patcher = patch("logs.utils.error_logger")

        self.mocked_success_logger = self.success_logger_patcher.start()
        self.mocked_error_logger = self.error_logger_patcher.start()

        self.entryclass_ip = EntryClass.objects.create(
            type=EntryType.ARTIFACT, subtype="ip"
        )

        self.entryclass_country = EntryClass.objects.create(
            type=EntryType.ARTIFACT, subtype="country"
        )

        self.entryclass1 = EntryClass.objects.create(
            type=EntryType.ENTITY, subtype="case"
        )

        self.entryclass2 = EntryClass.objects.create(
            type=EntryType.ARTIFACT, subtype="actor"
        )

    def tearDown(self):
        self.patcher.stop()
        self.success_logger_patcher.stop()
        self.error_logger_patcher.stop()
