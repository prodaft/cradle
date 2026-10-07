"""Tests for mapping create (POST) and update (PATCH) endpoints."""

import uuid

from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from entries.enums import EntryType
from entries.models import EntryClass
from intelio.models.mappings.catalyst import CatalystMapping
from user.models import CradleUser, UserRoles


class MappingSchemaViewTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = CradleUser.objects.create_user(
            username="manager",
            email="manager@test.com",
            password="testpass",
            role=UserRoles.ENTRY_MANAGER,
        )
        self.client.force_authenticate(user=self.user)
        self.url = reverse("mapping_schema", kwargs={"class_name": "catalystmapping"})
        self.entry_class = EntryClass.objects.create(type=EntryType.ARTIFACT, subtype="ip")
        self.payload = {"internal_class": "ip", "type": "ip", "field": "value", "link_type": "related"}

    def test_post_creates_mapping(self):
        response = self.client.post(self.url, self.payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn(f"mapping_id={response.json()['id']}", response["Location"])
        self.assertEqual(CatalystMapping.objects.count(), 1)

    def test_post_ignores_id_and_creates(self):
        response = self.client.post(self.url, {**self.payload, "id": str(uuid.uuid4())}, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(CatalystMapping.objects.count(), 1)

    def test_post_requires_internal_class(self):
        payload = {k: v for k, v in self.payload.items() if k != "internal_class"}
        response = self.client.post(self.url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(CatalystMapping.objects.exists())

    def test_post_missing_required_field_returns_400(self):
        payload = {k: v for k, v in self.payload.items() if k != "type"}
        response = self.client.post(self.url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("type", str(response.json()))
        self.assertFalse(CatalystMapping.objects.exists())

    def test_patch_updates_mapping(self):
        mapping = CatalystMapping.objects.create(
            internal_class=self.entry_class, type="ip", field="value", link_type="related"
        )
        response = self.client.patch(self.url, {"id": str(mapping.id), "field": "address"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["field"], "address")
        mapping.refresh_from_db()
        self.assertEqual(mapping.field, "address")

    def test_patch_requires_id(self):
        response = self.client.patch(self.url, {"field": "address"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_patch_unknown_id_returns_404(self):
        response = self.client.patch(self.url, {"id": str(uuid.uuid4()), "field": "address"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertFalse(CatalystMapping.objects.exists())

    def test_delete_removes_mapping(self):
        mapping = CatalystMapping.objects.create(
            internal_class=self.entry_class, type="ip", field="value", link_type="related"
        )
        response = self.client.delete(f"{self.url}?mapping_id={mapping.id}")

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(CatalystMapping.objects.exists())

    def test_delete_invalid_id_returns_400(self):
        response = self.client.delete(f"{self.url}?mapping_id=not-a-uuid")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
