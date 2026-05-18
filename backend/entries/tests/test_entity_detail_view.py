"""Tests for entity detail view (get, update, delete)."""

from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken

from user.models import CradleUser

from ..models import Entry
from .utils import EntriesTestCase


class DeleteEntityDetailsTest(EntriesTestCase):
    """Tests for DELETE /entities/<id>/."""

    def setUp(self):
        super().setUp()

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

    def test_delete_entity_authenticated_not_admin(self):
        entity = Entry.objects.create(name="Entity1", description="Description1", entry_class=self.entryclass1)

        response = self.client.delete(
            reverse("entity_detail", kwargs={"entity_id": entity.pk}),
            **self.headers_normal,
        )

        self.assertEqual(response.status_code, 403)

    def test_delete_entity_not_authenticated(self):
        entity = Entry.objects.create(name="Entity1", description="Description1", entry_class=self.entryclass1)

        response = self.client.delete(reverse("entity_detail", kwargs={"entity_id": entity.pk}))

        self.assertEqual(response.status_code, 401)
