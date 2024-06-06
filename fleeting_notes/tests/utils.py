from django.test import TestCase
from unittest.mock import patch

from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken

from fleeting_notes.models import FleetingNote
from user.models import CradleUser


class FleetingNotesTestCase(TestCase):
    def setUp(self):
        self.patcher = patch("file_transfer.utils.MinioClient.create_user_bucket")
        self.mocked_create_user_bucket = self.patcher.start()

        self.client = APIClient()

        self.admin_user = CradleUser.objects.create_user(
            username="admin", password="password", is_staff=True
        )
        self.normal_user = CradleUser.objects.create_user(
            username="user", password="password", is_staff=False
        )
        self.token_admin = str(AccessToken.for_user(self.admin_user))
        self.token_normal = str(AccessToken.for_user(self.normal_user))
        self.headers_admin = {"HTTP_AUTHORIZATION": f"Bearer {self.token_admin}"}
        self.headers_normal = {"HTTP_AUTHORIZATION": f"Bearer {self.token_normal}"}

    def tearDown(self):
        self.patcher.stop()
        FleetingNote.objects.all().delete()
        CradleUser.objects.all().delete()
