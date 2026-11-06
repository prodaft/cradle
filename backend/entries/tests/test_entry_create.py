from django.urls import reverse
from rest_framework.test import APIClient

from user.models import CradleUser, UserRoles
from user.testing import session_access_token

from ..enums import EntryType
from ..models import Entry, EntryClass
from .utils import EntriesTestCase


class EntryCreateTest(EntriesTestCase):
    def setUp(self):
        super().setUp()
        self.client = APIClient()
        self.user = CradleUser.objects.create_user(username="user", password="password", email="b@c.d")
        self.admin = CradleUser.objects.create_user(
            username="admin", password="password", email="a@c.d", role=UserRoles.ADMIN
        )
        self.headers = {"HTTP_COOKIE": f"access_token={session_access_token(self.user)}"}
        self.headers_admin = {"HTTP_COOKIE": f"access_token={session_access_token(self.admin)}"}

    def post(self, data, headers=None):
        return self.client.post(
            reverse("entry_create"), data, content_type="application/json", **(headers or self.headers)
        )

    def test_create_artifact(self):
        response = self.post({"type": "artifact", "subtype": "username", "name": "alice"})

        self.assertEqual(response.status_code, 201, response.content)
        entry = Entry.objects.get(name="alice", entry_class=self.entryclass_username)
        self.assertEqual(response.json()["id"], entry.id)
        self.assertEqual(response.json()["subtype"], "username")
        self.assertIn("Location", response)

    def test_create_artifact_duplicate(self):
        Entry.objects.create(name="alice", entry_class=self.entryclass_username)

        response = self.post({"type": "artifact", "subtype": "username", "name": "alice"})

        self.assertEqual(response.status_code, 409)

    def test_create_artifact_unknown_subtype(self):
        response = self.post({"type": "artifact", "subtype": "nope", "name": "alice"})

        self.assertEqual(response.status_code, 404)
        self.assertFalse(EntryClass.objects.filter(subtype="nope").exists())

    def test_create_artifact_with_entity_subtype(self):
        response = self.post({"type": "artifact", "subtype": "case", "name": "alice"})

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["code"], "ENTRY_TYPE_MISMATCH")

    def test_create_artifact_invalid_format(self):
        EntryClass.objects.create(type=EntryType.ARTIFACT, subtype="ip", regex=r"\d+\.\d+\.\d+\.\d+")

        response = self.post({"type": "artifact", "subtype": "ip", "name": "not-an-ip"})

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["code"], "INVALID_ENTRY")
        self.assertFalse(Entry.objects.filter(name="not-an-ip").exists())

    def test_entities_are_created_at_their_own_endpoint(self):
        """POST /entries/ only creates artifacts; entities go through POST /entries/entities/."""
        response = self.post({"type": "entity", "subtype": "case", "name": "Case 1"}, self.headers_admin)

        self.assertEqual(response.status_code, 400, response.content)
        self.assertEqual(response.json()["code"], "INVALID_ENTRY_TYPE")
        self.assertFalse(Entry.objects.filter(name="Case 1").exists())

    def test_type_defaults_to_artifact(self):
        response = self.post({"subtype": "username", "name": "bob"})

        self.assertEqual(response.status_code, 201, response.content)
