"""Tests for enrichment view permissions (HasAdminRole vs is_staff)."""

from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from user.models import CradleUser, UserRoles


class EnrichmentAdminAccessTest(TestCase):
    """Verify enrichment endpoints use HasAdminRole (role=ADMIN), not is_staff."""

    def setUp(self):
        self.client = APIClient()
        self.enrichment_settings_url = reverse("enrichment_schema", kwargs={"enricher_type": "VirusTotalEnricher"})
        self.admin = CradleUser.objects.create_user(
            username="admin",
            email="admin@test.com",
            password="testpass",
            role=UserRoles.ADMIN,
        )
        self.staff_user = CradleUser.objects.create_user(
            username="staff",
            email="staff@test.com",
            password="testpass",
            role=UserRoles.USER,
        )
        self.staff_user.is_staff = True
        self.staff_user.save()

    def test_admin_can_access_enrichment_settings(self):
        """Admin (role=ADMIN) can access enrichment settings."""
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(self.enrichment_settings_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_staff_without_admin_role_cannot_access_admin_endpoints(self):
        """Staff user (is_staff=True) without admin role gets 403."""
        self.client.force_authenticate(user=self.staff_user)
        response = self.client.get(self.enrichment_settings_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
