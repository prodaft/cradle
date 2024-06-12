from django.test import TestCase
from unittest.mock import patch
from rest_framework_simplejwt.tokens import AccessToken

from user.models import CradleUser
from notes.models import Note
from entities.models import Entity, EntityType
from access.models import Access, AccessType


class DashboardsTestCase(TestCase):
    def create_users(self):
        self.admin_user = CradleUser.objects.create_superuser(
            username="admin", password="password", is_staff=True
        )
        self.user1 = CradleUser.objects.create_user(
            username="user1", password="password", is_staff=False
        )
        self.user2 = CradleUser.objects.create_user(
            username="user2", password="password", is_staff=False
        )

    def create_tokens(self):
        self.token_user2 = str(AccessToken.for_user(self.user2))
        self.token_admin = str(AccessToken.for_user(self.admin_user))
        self.token_user1 = str(AccessToken.for_user(self.user1))
        self.headers_admin = {"HTTP_AUTHORIZATION": f"Bearer {self.token_admin}"}
        self.headers_user1 = {"HTTP_AUTHORIZATION": f"Bearer {self.token_user1}"}
        self.headers_user2 = {"HTTP_AUTHORIZATION": f"Bearer {self.token_user2}"}

    def create_notes(self):
        self.note1 = Note.objects.create(content="Note1")
        self.note1.entities.add(self.case1, self.actor1, self.metadata1)

        self.note2 = Note.objects.create(content="Note2")
        self.note2.entities.add(self.case2, self.actor2, self.case1)

    def create_cases(self):
        self.case1 = Entity.objects.create(
            name="Case1", description="Description1", type=EntityType.CASE
        )

        self.case2 = Entity.objects.create(
            name="Case2", description="Description2", type=EntityType.CASE
        )

    def create_actors(self):
        self.actor1 = Entity.objects.create(
            name="Actor1", description="Description1", type=EntityType.ACTOR
        )

        self.actor2 = Entity.objects.create(
            name="Actor2", description="Description2", type=EntityType.ACTOR
        )

    def create_metadata(self):
        self.metadata1 = Entity.objects.create(
            name="Metadata1", description="Description1", type=EntityType.METADATA
        )

    def create_access(self):
        self.access1 = Access.objects.create(
            user=self.user1, case=self.case1, access_type=AccessType.READ_WRITE
        )

        self.access2 = Access.objects.create(
            user=self.user1, case=self.case2, access_type=AccessType.READ
        )

        self.access3 = Access.objects.create(
            user=self.user2, case=self.case1, access_type=AccessType.READ
        )

        self.access4 = Access.objects.create(
            user=self.user2, case=self.case2, access_type=AccessType.NONE
        )

    def setUp(self):
        self.patcher = patch("file_transfer.utils.MinioClient.create_user_bucket")
        self.mocked_create_user_bucket = self.patcher.start()

        self.success_logger_patcher = patch("logs.utils.success_logger")
        self.error_logger_patcher = patch("logs.utils.error_logger")

        self.mocked_success_logger = self.success_logger_patcher.start()
        self.mocked_error_logger = self.error_logger_patcher.start()

        self.create_users()
        self.create_tokens()
        self.create_cases()
        self.create_access()
        self.create_actors()
        self.create_metadata()
        self.create_notes()

    def tearDown(self):
        self.patcher.stop()
        self.success_logger_patcher.stop()
        self.error_logger_patcher.stop()
