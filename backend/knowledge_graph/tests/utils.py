from django.test import TestCase
from unittest.mock import patch
from collections import Counter

from entries.enums import EntryType
from entries.models import EntryClass


class KnowledgeGraphTestCase(TestCase):
    def setUp(self):
        self.patcher = patch("file_transfer.utils.MinioClient.create_user_bucket")
        self.mocked_create_user_bucket = self.patcher.start()

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

        self.entryclass1.save()
        self.entryclass2.save()
        self.entryclass_ip.save()
        self.entryclass_country.save()

    def assertLinksEqual(self, result, expected):
        transformed_result = [tuple(sorted(d.values())) for d in result]
        self.assertEqual(Counter(transformed_result), Counter(expected))

    def tearDown(self):
        self.patcher.stop()
