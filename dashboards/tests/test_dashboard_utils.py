from django.test import TestCase
from user.models import CradleUser
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken
from unittest.mock import patch, PropertyMock

from entities.models import Entity
from entities.enums import EntityType, EntitySubtype
from access.models import Access
from notes.models import Note
from ..utils.dashboard_utils import DashboardUtils


class DashboardUtilsDashboardJsonTest(TestCase):

    def create_users(self):
        self.admin_user = CradleUser.objects.create_superuser(
            username="admin", password="password", is_staff=True
        )
        self.normal_user = CradleUser.objects.create_user(
            username="user", password="password", is_staff=False
        )
        self.user2 = CradleUser.objects.create_user(
            username="user2", password="password", is_staff=False
        )

    def create_tokens(self):
        self.token_user2 = str(AccessToken.for_user(self.user2))
        self.token_admin = str(AccessToken.for_user(self.admin_user))
        self.token_normal = str(AccessToken.for_user(self.normal_user))
        self.headers_admin = {"HTTP_AUTHORIZATION": f"Bearer {self.token_admin}"}
        self.headers_normal = {"HTTP_AUTHORIZATION": f"Bearer {self.token_normal}"}
        self.headers_user2 = {"HTTP_AUTHORIZATION": f"Bearer {self.token_user2}"}

    def create_notes(self):
        self.note1 = Note.objects.create(content="Note1")
        self.note1.entities.set([self.case1, self.actor1, self.metadata1])

        self.note2 = Note.objects.create(content="Note2")
        self.note2.entities.set([self.case2, self.actor2, self.case1])

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
            name="Metadata1",
            description="Description1",
            type=EntityType.METADATA,
            subtype=EntitySubtype.COUNTRY,
        )

    def create_access(self):
        self.access1 = Access.objects.create(
            user=self.normal_user, case=self.case1, access_type="read-write"
        )

        self.access2 = Access.objects.create(
            user=self.normal_user, case=self.case2, access_type="none"
        )

        self.access3 = Access.objects.create(
            user=self.user2, case=self.case1, access_type="read"
        )

    def setUp(self):
        self.client = APIClient()

        self.create_users()

        self.create_tokens()

        self.create_cases()

        self.create_actors()

        self.create_metadata()

        self.create_access()

        self.create_notes()

    @patch("notes.models.Note.timestamp", new_callable=PropertyMock)
    def test_get_dashboard_json(self, mock_timestamp):
        mock_timestamp.return_value = "2024-01-01T00:00:00Z"

        notes = Note.objects.all()
        actors = Entity.objects.filter(type=EntityType.ACTOR)
        cases = Entity.objects.filter(type=EntityType.CASE)
        metadata = Entity.objects.filter(type=EntityType.METADATA)
        entries = Entity.objects.filter(type=EntityType.ENTRY)

        dashboard_json = DashboardUtils.get_dashboard_json(
            entity=self.case1,
            notes=notes,
            actors=actors,
            cases=cases,
            metadata=metadata,
            entries=entries,
            user=self.normal_user,
        )

        expected_json = {
            "id": self.case1.id,
            "name": "Case1",
            "description": "Description1",
            "type": "case",
            "subtype": "",
            "notes": [
                {
                    "id": self.note1.id,
                    "content": "Note1",
                    "timestamp": "2024-01-01T00:00:00Z",
                    "entities": [
                        {"name": "Case1", "type": "case", "subtype": ""},
                        {"name": "Actor1", "type": "actor", "subtype": ""},
                        {"name": "Metadata1", "type": "metadata", "subtype": "country"},
                    ],
                },
                {
                    "id": self.note2.id,
                    "content": "Note2",
                    "timestamp": "2024-01-01T00:00:00Z",
                    "entities": [
                        {"name": "Case1", "type": "case", "subtype": ""},
                        {"name": "Case2", "type": "case", "subtype": ""},
                        {"name": "Actor2", "type": "actor", "subtype": ""},
                    ],
                },
            ],
            "actors": [
                {"name": "Actor1", "description": "Description1"},
                {"name": "Actor2", "description": "Description2"},
            ],
            "cases": [
                {"name": "Case1", "description": "Description1", "access": True},
                {"name": "Case2", "description": "Description2", "access": False},
            ],
            "entries": [],
            "metadata": [
                {
                    "name": "Metadata1",
                    "description": "Description1",
                    "subtype": "country",
                }
            ],
        }

        self.assertEqual(dashboard_json, expected_json)
