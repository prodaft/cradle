"""Tests for the report detail API."""

from unittest.mock import patch

from django.test import TestCase
from django.urls import reverse
from rest_framework_simplejwt.tokens import AccessToken

from user.models import CradleUser

from ..models import DownloadStrategies, PublishedReport


class ReportDetailTest(TestCase):
    def setUp(self):
        self.patcher = patch("file_transfer.s3_utils.ensure_cradle_buckets_exist")
        self.patcher.start()
        self.user = CradleUser.objects.create_user(
            username="user", password="user", email="user@example.com", is_active=True, email_confirmed=True
        )
        self.headers = {"HTTP_AUTHORIZATION": f"Bearer {AccessToken.for_user(self.user)}"}
        self.report = PublishedReport.objects.create(user=self.user, title="Report", strategy=DownloadStrategies.HTML)

    def tearDown(self):
        self.patcher.stop()
        super().tearDown()

    def test_retrieve_by_report_id(self):
        url = reverse("report_detail", kwargs={"report_id": self.report.id})

        response = self.client.get(url, **self.headers)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["id"], str(self.report.id))

    def test_other_users_report_is_not_found(self):
        other = CradleUser.objects.create_user(
            username="other", password="other", email="other@example.com", is_active=True, email_confirmed=True
        )
        report = PublishedReport.objects.create(user=other, title="Other", strategy=DownloadStrategies.HTML)

        response = self.client.get(reverse("report_detail", kwargs={"report_id": report.id}), **self.headers)

        self.assertEqual(response.status_code, 404)
