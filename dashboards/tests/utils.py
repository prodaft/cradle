from django.test import TestEntity
from unittest.mock import patch
from rest_framework_simplejwt.tokens import AccessToken

from user.models import CradleUser
from notes.models import Note
from entries.models import Entry
from entries.enums import EntryType, ArtifactSubtype
from access.models import Access, AccessType


class DashboardsTestEntity(TestEntity):
    def create_users(self):
        self.admin_user = CradleUser.objects.create_superuser(
            username="admin",
            password="password",
            is_staff=True,
            email="alabala@gmail.com",
        )
        self.user1 = CradleUser.objects.create_user(
            username="user1",
            password="password",
            is_staff=False,
            email="b@c.d",
        )
        self.user2 = CradleUser.objects.create_user(
            username="user2",
            password="password",
            is_staff=False,
            email="c@d.e",
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
        self.note1.entries.add(self.entity1)

        self.note2 = Note.objects.create(content="Note2")
        self.note2.entries.add(self.entity2, self.entity1)

        self.note3 = Note.objects.create(content="Note3")
        self.note3.entries.add(self.entity3, self.artifact1)

    def create_entities(self):
        self.entity1 = Entry.objects.create(
            name="Entity1", description="Description1", type=EntryType.ENTITY
        )

        self.entity2 = Entry.objects.create(
            name="Entity2", description="Description2", type=EntryType.ENTITY
        )

        self.entity3 = Entry.objects.create(
            name="Entity3", description="Description3", type=EntryType.ENTITY
        )


    def create_access(self):
        self.access1 = Access.objects.create(
            user=self.user1, entity=self.entity1, access_type=AccessType.READ_WRITE
        )

        self.access2 = Access.objects.create(
            user=self.user1, entity=self.entity2, access_type=AccessType.READ
        )

        self.access3 = Access.objects.create(
            user=self.user2, entity=self.entity1, access_type=AccessType.READ
        )

        self.access4 = Access.objects.create(
            user=self.user2, entity=self.entity2, access_type=AccessType.NONE
        )

    def create_artifacts(self):
        self.artifact1 = Entry.objects.create(
            name="Artifact1",
            description="Description1",
            type=EntryType.ARTIFACT,
            subtype=ArtifactSubtype.IP,
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
        self.create_entities()
        self.create_access()
        self.create_artifacts()
        self.create_notes()

    def tearDown(self):
        self.patcher.stop()
        self.success_logger_patcher.stop()
        self.error_logger_patcher.stop()
