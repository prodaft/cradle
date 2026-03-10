from unittest.mock import patch

from django.test import TestCase

from entries.enums import EntryType
from entries.models import EntryClass
from user.models import CradleUser


class NotesTestCase(TestCase):
    def setUp(self):
        self.patcher = patch("file_transfer.s3_utils.ensure_cradle_buckets_exist")
        self.patcher.start()

        self.user = CradleUser.objects.create_user(username="user", password="user", email="alabala@gmail.com")

        self.entryclass_ip = EntryClass.objects.create(type=EntryType.ARTIFACT, subtype="ip")

        self.entryclass_country = EntryClass.objects.create(type=EntryType.ARTIFACT, subtype="country")

        self.entryclass1 = EntryClass.objects.create(type=EntryType.ENTITY, subtype="case")

        self.entryclass2 = EntryClass.objects.create(type=EntryType.ARTIFACT, subtype="actor")

        self.entryclass1.save()
        self.entryclass2.save()
        self.entryclass_ip.save()
        self.entryclass_country.save()

    def tearDown(self):
        self.patcher.stop()
