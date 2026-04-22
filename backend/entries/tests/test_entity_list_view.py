"""Tests for entity list view (list and create)."""

import json

from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken

from user.models import CradleUser, UserRoles

from ..models import Entry
from .utils import EntriesTestCase


class EntityListTestCase(EntriesTestCase):
    """Shared setup for entity list view tests."""

    def setUp(self):
        super().setUp()
        self.client = APIClient()
        self.admin_user = CradleUser.objects.create_user(
            username="admin",
            password="password",
            role=UserRoles.ADMIN,
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


class GetEntityListTest(EntityListTestCase):
    def test_get_entities_authenticated_not_admin(self):
        response = self.client.get(reverse("entity_list"), **self.headers_normal)

        self.assertEqual(response.status_code, 403)

    def test_get_entities_not_authenticated(self):
        response = self.client.get(reverse("entity_list"))

        self.assertEqual(response.status_code, 401)

    def test_get_entities_stream_matches_paginated_list(self):
        response_list = self.client.get(
            reverse("entity_list"),
            {"page": "1", "page_size": "200"},
            **self.headers_admin,
        )
        response_stream = self.client.get(reverse("entity_list_stream"), **self.headers_admin)
        self.assertEqual(response_stream.status_code, 200)
        self.assertEqual(response_stream.headers["Content-Type"], "application/x-ndjson")
        text = b"".join(response_stream.streaming_content).decode()
        rows = [json.loads(line) for line in text.splitlines() if line.strip()]
        self.assertEqual(rows, response_list.json()["results"])


class PostEntityListTest(EntityListTestCase):
    """Tests for POST /entities/."""

    def test_create_entity_admin(self):
        entity_json = {
            "type": "entity",
            "name": "entity1",
            "subtype": self.entryclass1.subtype,
            "description": "description1",
        }

        response_post = self.client.post(
            reverse("entity_list"),
            entity_json,
            format="json",
            **self.headers_admin,
        )

        self.assertEqual(response_post.status_code, 201)
        self.assertEqual(Entry.entities.count(), 1)

        self.assertEqual(Entry.entities.get().name, "entity1")

    def test_create_entity_no_description_admin(self):
        entity_json = {"name": "entity1", "subtype": "case", "type": "entity"}

        response_post = self.client.post(
            reverse("entity_list"),
            entity_json,
            format="json",
            **self.headers_admin,
        )
        self.assertEqual(response_post.status_code, 201)

        self.assertEqual(Entry.entities.count(), 1)
        self.assertEqual(Entry.entities.get().name, "entity1")

    def test_create_entity_duplicate_admin(self):
        entity_json = {
            "type": "entity",
            "name": "entity1",
            "subtype": "case",
            "description": "description1",
        }

        response_post = self.client.post(
            reverse("entity_list"),
            entity_json,
            format="json",
            **self.headers_admin,
        )
        self.assertEqual(response_post.status_code, 201)

        response_post = self.client.post(
            reverse("entity_list"),
            entity_json,
            format="json",
            **self.headers_admin,
        )
        self.assertEqual(response_post.status_code, 409)

    def test_create_invalid_entity(self):
        entity_json = {"description": "description1"}

        response_post = self.client.post(
            reverse("entity_list"),
            entity_json,
            format="json",
            **self.headers_admin,
        )
        self.assertEqual(response_post.status_code, 400)

        with self.assertRaises(Entry.DoesNotExist):
            Entry.entities.get(name="entity1")

    def test_create_entity_authenticated_not_admin(self):
        entity_json = {
            "type": "entity",
            "name": "entity1",
            "subtype": "case",
            "description": "description1",
        }

        response_post = self.client.post(
            reverse("entity_list"),
            entity_json,
            format="json",
            **self.headers_normal,
        )
        self.assertEqual(response_post.status_code, 403)

    def test_create_entity_not_authenticated(self):
        entity_json = {
            "type": "entity",
            "name": "entity1",
            "subtype": "case",
            "description": "description1",
        }

        response_post = self.client.post(reverse("entity_list"), entity_json, format="json")
        self.assertEqual(response_post.status_code, 401)
