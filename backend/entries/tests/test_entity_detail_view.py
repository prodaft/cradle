from user.models import CradleUser
from django.urls import reverse
from rest_framework.parsers import JSONParser
from rest_framework.test import APIClient
import io
from rest_framework_simplejwt.tokens import AccessToken
from .utils import EntriesTestCase

from ..models import Entry

import uuid


def bytes_to_json(data):
    return JSONParser().parse(io.BytesIO(data))


class DeleteEntityDetailsTest(EntriesTestCase):
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

    def test_delete_entity_admin(self):
        entity = Entry.objects.create(
            name="Entity1", description="Description1", entry_class=self.entryclass1
        )

        response = self.client.delete(
            reverse("entity_detail", kwargs={"entity_id": entity.pk}),
            **self.headers_admin,
        )

        self.assertEqual(response.status_code, 200)

    def test_delete_entity_authenticated_not_admin(self):
        entity = Entry.objects.create(
            name="Entity1", description="Description1", entry_class=self.entryclass1
        )

        response = self.client.delete(
            reverse("entity_detail", kwargs={"entity_id": entity.pk}),
            **self.headers_normal,
        )

        self.assertEqual(response.status_code, 403)

    def test_delete_entity_not_authenticated(self):
        entity = Entry.objects.create(
            name="Entity1", description="Description1", entry_class=self.entryclass1
        )

        response = self.client.delete(
            reverse("entity_detail", kwargs={"entity_id": entity.pk})
        )

        self.assertEqual(response.status_code, 401)

    def test_delete_entity_admin_wrong_id(self):
        Entry.objects.create(
            name="Entity1", description="Description1", entry_class=self.entryclass1
        )

        response = self.client.delete(
            reverse("entity_detail", kwargs={"entity_id": uuid.uuid4()}),
            **self.headers_admin,
        )

        self.assertEqual(response.status_code, 404)
