import json

from django.urls import reverse
from rest_framework_simplejwt.tokens import AccessToken

from entries.models import Entry
from user.models import CradleUser

from ..enums import AccessType
from ..models import Access
from .utils import AccessTestCase


class AccessListTest(AccessTestCase):
    def setUp(self):
        super().setUp()

        self.user = CradleUser.objects.create_user(username="user", password="pass", email="alabala@gmail.com")
        self.admin = CradleUser.objects.create_superuser(username="admin", password="pass", email="b@c.d")
        self.token_admin = str(AccessToken.for_user(self.admin))
        self.token_normal = str(AccessToken.for_user(self.user))
        self.headers_admin = {"HTTP_AUTHORIZATION": f"Bearer {self.token_admin}"}
        self.headers_normal = {"HTTP_AUTHORIZATION": f"Bearer {self.token_normal}"}
        self.entity, created = Entry.objects.get_or_create(
            name="Entity 1", description="Cool entity", entry_class=self.entryclass1
        )

    def test_access_list_success(self):
        response = self.client.get(
            reverse(
                "user_access_list",
                kwargs={"user_id": self.user.id},
            ),
            **self.headers_admin,
        )

        expected_results = [{"id": self.entity.id, "name": "Entity 1", "access_type": "none"}]

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["results"], expected_results)

    def test_access_list_not_admin(self):
        response = self.client.get(
            reverse(
                "user_access_list",
                kwargs={"user_id": self.user.id},
            ),
            **self.headers_normal,
        )

        self.assertEqual(response.status_code, 403)

    def test_access_list_admin(self):
        response = self.client.get(
            reverse(
                "user_access_list",
                kwargs={"user_id": self.admin.id},
            ),
            **self.headers_admin,
        )

        expected_results = [{"id": self.entity.id, "name": "Entity 1", "access_type": "read-write"}]

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["results"], expected_results)

    def test_access_list_not_authenticated(self):
        response = self.client.get(
            reverse(
                "user_access_list",
                kwargs={"user_id": self.user.id},
            ),
        )

        self.assertEqual(response.status_code, 401)

    def test_access_list_access_already_there(self):
        Access.objects.create(user=self.user, entity=self.entity, access_type=AccessType.READ)
        response = self.client.get(
            reverse(
                "user_access_list",
                kwargs={"user_id": self.user.id},
            ),
            **self.headers_admin,
        )

        expected_results = [{"id": self.entity.id, "name": "Entity 1", "access_type": "read"}]

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["results"], expected_results)

    def test_access_list_multiple_entities(self):
        Access.objects.create(user=self.user, entity=self.entity, access_type=AccessType.READ)
        entity2 = Entry.objects.create(name="Entity 2", entry_class=self.entryclass1)

        response = self.client.get(
            reverse(
                "user_access_list",
                kwargs={"user_id": self.user.id},
            ),
            **self.headers_admin,
        )

        expected_results = [
            {"id": self.entity.id, "name": "Entity 1", "access_type": "read"},
            {"id": entity2.id, "name": "Entity 2", "access_type": "none"},
        ]

        self.assertEqual(response.status_code, 200)
        self.assertCountEqual(response.json()["results"], expected_results)

    def test_user_access_list_stream_matches_paginated_list(self):
        response_list = self.client.get(
            reverse("user_access_list", kwargs={"user_id": self.user.id}),
            {"page": "1", "page_size": "200"},
            **self.headers_admin,
        )
        response_stream = self.client.get(
            reverse("user_access_list_stream", kwargs={"user_id": self.user.id}),
            **self.headers_admin,
        )
        self.assertEqual(response_stream.status_code, 200)
        self.assertEqual(response_stream.headers["Content-Type"], "application/x-ndjson")
        rows = [json.loads(line) for line in response_stream.content.decode().splitlines() if line.strip()]
        self.assertEqual(rows, response_list.json()["results"])

    def test_entity_access_list_stream_matches_paginated_list(self):
        response_list = self.client.get(
            reverse("entity_access_list", kwargs={"entity_id": self.entity.id}),
            {"page": "1", "page_size": "200"},
            **self.headers_admin,
        )
        response_stream = self.client.get(
            reverse("entity_access_list_stream", kwargs={"entity_id": self.entity.id}),
            **self.headers_admin,
        )
        self.assertEqual(response_stream.status_code, 200)
        self.assertEqual(response_stream.headers["Content-Type"], "application/x-ndjson")
        rows = [json.loads(line) for line in response_stream.content.decode().splitlines() if line.strip()]
        self.assertEqual(rows, response_list.json()["results"])
