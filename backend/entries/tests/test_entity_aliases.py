"""Aliasing artifacts to an entity requires being able to see those artifacts."""

from unittest.mock import patch

from django.urls import reverse
from rest_framework.test import APIClient

from access.enums import AccessType
from access.models import Access
from user.models import CradleUser, UserRoles
from user.testing import session_access_token

from ..managers import EntryManager
from ..models import Entry
from .utils import EntriesTestCase


class EntityAliasAccessTest(EntriesTestCase):
    def setUp(self):
        super().setUp()
        self.client = APIClient()
        self.manager = CradleUser.objects.create_user(
            username="manager", password="password", email="m@c.d", role=UserRoles.MANAGER
        )
        self.headers = {"HTTP_COOKIE": f"access_token={session_access_token(self.manager)}"}
        self.entity = Entry.objects.create(name="Case 1", entry_class=self.entryclass1)
        Access.objects.create(user=self.manager, entity=self.entity, access_type=AccessType.READ_WRITE)
        self.visible = Entry.objects.create(name="alice", entry_class=self.entryclass_username)
        self.hidden = Entry.objects.create(name="bob", entry_class=self.entryclass_username)

    def patch_aliases(self, *aliases):
        # Visibility comes from the edges materialized view; stub it so only ``self.visible`` is visible.
        with patch.object(EntryManager, "accessible", return_value=Entry.objects.filter(pk=self.visible.pk)):
            return self.client.patch(
                reverse("entity_detail", kwargs={"entity_id": self.entity.pk}),
                {"name": self.entity.name, "subtype": "case", "alias_ids": [a.pk for a in aliases]},
                format="json",
                **self.headers,
            )

    def test_alias_visible_artifact(self):
        response = self.patch_aliases(self.visible)

        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(list(self.entity.aliases.all()), [self.visible])

    def test_alias_hidden_artifact_rejected(self):
        response = self.patch_aliases(self.visible, self.hidden)

        self.assertEqual(response.status_code, 403)
        self.assertNotContains(response, "bob", status_code=403)
        self.assertFalse(self.entity.aliases.exists())

    def test_keeping_existing_hidden_alias_allowed(self):
        self.entity.aliases.add(self.hidden)

        response = self.patch_aliases(self.hidden, self.visible)

        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(set(self.entity.aliases.all()), {self.hidden, self.visible})
