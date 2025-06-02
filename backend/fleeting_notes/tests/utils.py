from django.test import TestCase
from unittest.mock import patch

from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken

from entries.enums import EntryType
from entries.models import EntryClass
from notes.models import Note
from user.models import CradleUser


class FleetingNotesTestCase(TestCase):
    def setUp(self):
        self.patcher = patch("file_transfer.utils.MinioClient.create_user_bucket")
        self.mocked_create_user_bucket = self.patcher.start()

        self.success_logger_patcher = patch("logs.utils.success_logger")
        self.error_logger_patcher = patch("logs.utils.error_logger")

        self.mocked_success_logger = self.success_logger_patcher.start()
        self.mocked_error_logger = self.error_logger_patcher.start()

        self.client = APIClient()

        self.admin_user = CradleUser.objects.create_user(
            username="admin",
            password="password",
            is_staff=True,
            email="alabala@gmail.com",
        )
        self.normal_user = CradleUser.objects.create_user(
            username="user",
            password="password",
            is_staff=False,
            email="b@c.d",
        )
        self.token_admin = str(AccessToken.for_user(self.admin_user))
        self.token_normal = str(AccessToken.for_user(self.normal_user))
        self.headers_admin = {"HTTP_AUTHORIZATION": f"Bearer {self.token_admin}"}
        self.headers_normal = {"HTTP_AUTHORIZATION": f"Bearer {self.token_normal}"}

        self.note_admin = Note.objects.fleeting().create(
            content="Note1", author=self.admin_user
        )
        self.note_user = Note.objects.fleeting().create(
            content="[[actor:actor]] [[case:entity]]", author=self.normal_user
        )

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

    def tearDown(self):
        self.patcher.stop()
        self.success_logger_patcher.stop()
        self.error_logger_patcher.stop()
        Note.objects.fleeting().all().delete()
        CradleUser.objects.all().delete()
