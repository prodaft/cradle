from django.urls import reverse
from rest_framework.test import APIClient

from user.models import CradleUser, UserRoles
from user.testing import session_access_token

from ..enums import EntryType
from ..models import Entry, EntryClass
from .utils import EntriesTestCase


class EntriesBadInputTest(EntriesTestCase):
    def setUp(self):
        super().setUp()
        self.client = APIClient()
        self.admin = CradleUser.objects.create_user(
            username="admin", password="password", email="a@c.d", role=UserRoles.ADMIN
        )
        self.headers = {"HTTP_COOKIE": f"access_token={session_access_token(self.admin)}"}

    def post(self, name, data):
        return self.client.post(reverse(name), data, format="json", **self.headers)

    def test_entry_class_subtype_with_slashes_is_normalized(self):
        response = self.post("entry_class_list", {"type": EntryType.ARTIFACT, "subtype": "/domain/"})

        self.assertEqual(response.status_code, 201, response.content)
        self.assertTrue(EntryClass.objects.filter(subtype="domain").exists())

    def test_entry_class_subtype_with_slash_duplicate_is_400(self):
        response = self.post("entry_class_list", {"type": EntryType.ARTIFACT, "subtype": "username/"})

        self.assertEqual(response.status_code, 400, response.content)

    def test_entry_create_with_array_body_is_400(self):
        response = self.post("entry_create", [{"type": "artifact", "subtype": "username", "name": "alice"}])

        self.assertEqual(response.status_code, 400, response.content)
        self.assertFalse(Entry.objects.filter(name="alice").exists())

    def test_entity_create_with_array_body_is_400(self):
        response = self.post("entity_list", [{"subtype": "case", "name": "c1"}])

        self.assertEqual(response.status_code, 400, response.content)
        self.assertFalse(Entry.objects.filter(name="c1").exists())

    def test_next_name_route_takes_subtypes_with_slashes(self):
        """The next-name route sits before the greedy <path:> detail route; it must keep winning."""
        EntryClass.objects.create(type=EntryType.ENTITY, subtype="actor/apt", prefix="APT-")
        Entry.objects.create(name="APT-7", entry_class=EntryClass.objects.get(subtype="actor/apt"))

        response = self.client.get(reverse("next_name", kwargs={"class_subtype": "actor/apt"}), **self.headers)

        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.json(), {"name": "APT-8"})
