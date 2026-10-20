"""Entity resource: partial PATCH and read access on both entity URLs."""

from django.urls import reverse
from rest_framework.test import APIClient

from user.models import CradleUser, UserRoles
from user.testing import session_access_token

from ..models import Entry
from .utils import EntriesTestCase


class EntityResourceTest(EntriesTestCase):
    def setUp(self):
        super().setUp()
        self.client = APIClient()
        admin = CradleUser.objects.create_user(username="admin", password="pw", email="a@c.d", role=UserRoles.ADMIN)
        reader = CradleUser.objects.create_user(username="reader", password="pw", email="r@c.d")
        self.admin = {"HTTP_COOKIE": f"access_token={session_access_token(admin)}"}
        self.reader = {"HTTP_COOKIE": f"access_token={session_access_token(reader)}"}
        self.entity = Entry.objects.create(name="c1", entry_class=self.entryclass1, description="old", is_public=False)

    def test_patch_changes_only_given_fields(self):
        response = self.client.patch(
            reverse("entity_detail", kwargs={"entity_id": self.entity.id}),
            {"description": "new"},
            format="json",
            **self.admin,
        )

        self.assertEqual(response.status_code, 200, response.content)
        self.entity.refresh_from_db()
        self.assertEqual((self.entity.name, self.entity.description), ("c1", "new"))
        self.assertEqual(self.entity.entry_class, self.entryclass1)

    def test_unreadable_entity_is_404_on_both_urls(self):
        for url in (
            reverse("entity_detail", kwargs={"entity_id": self.entity.id}),
            reverse("entry_detail", kwargs={"entry_id": self.entity.id}),
        ):
            with self.subTest(url=url):
                self.assertEqual(self.client.get(url, **self.reader).status_code, 404)
