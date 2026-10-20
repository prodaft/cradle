"""Tests for the report detail API."""

from unittest.mock import patch

from django.test import TestCase
from django.urls import reverse

from notes.models import Note
from user.models import CradleUser
from user.testing import session_access_token

from ..models import DownloadStrategies, PublishedReport


class ReportDetailTest(TestCase):
    def setUp(self):
        self.patcher = patch("file_transfer.s3_utils.ensure_cradle_buckets_exist")
        self.patcher.start()
        self.user = CradleUser.objects.create_user(
            username="user", password="user", email="user@example.com", is_active=True, email_confirmed=True
        )
        self.headers = {"HTTP_COOKIE": f"access_token={session_access_token(self.user)}"}
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

    def test_publish_stores_tlp_label(self):
        note = Note.objects.create(author=self.user, content="Body", title="Note")

        with patch("publish.views.reports.generate_report.delay"):
            response = self.client.post(
                reverse("report_list"),
                {
                    "note_ids": [str(note.id)],
                    "title": "Marked",
                    "strategy": "pdf",
                    "tlp": "red",
                    "include_toc": False,
                },
                content_type="application/json",
                **self.headers,
            )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["tlp"], "red")
        report = PublishedReport.objects.get(id=response.json()["id"])
        self.assertEqual(report.tlp, "red")
        self.assertEqual(report.extra_data, {"include_toc": False, "include_entries": True})

    def test_html_report_stores_report_options(self):
        note = Note.objects.create(author=self.user, content="Body", title="Note")

        with patch("publish.views.reports.generate_report.delay"):
            response = self.client.post(
                reverse("report_list"),
                {"note_ids": [str(note.id)], "title": "Web", "strategy": "html", "include_entries": False},
                content_type="application/json",
                **self.headers,
            )

        self.assertEqual(response.status_code, 201)
        report = PublishedReport.objects.get(id=response.json()["id"])
        self.assertEqual(report.extra_data, {"include_toc": True, "include_entries": False})

    def test_report_options_are_not_stored_for_data_formats(self):
        note = Note.objects.create(author=self.user, content="Body", title="Note")

        with patch("publish.views.reports.generate_report.delay"):
            response = self.client.post(
                reverse("report_list"),
                {"note_ids": [str(note.id)], "title": "Plain", "strategy": "json", "tlp": "red"},
                content_type="application/json",
                **self.headers,
            )

        self.assertEqual(response.status_code, 201)
        report = PublishedReport.objects.get(id=response.json()["id"])
        self.assertIsNone(report.extra_data)
        self.assertEqual(report.tlp, "clear")

    def test_publish_rejects_blank_tlp(self):
        note = Note.objects.create(author=self.user, content="Body", title="Note")

        with patch("publish.views.reports.generate_report.delay") as delay:
            response = self.client.post(
                reverse("report_list"),
                {"note_ids": [str(note.id)], "title": "Unmarked", "strategy": "pdf", "tlp": ""},
                content_type="application/json",
                **self.headers,
            )

        self.assertEqual(response.status_code, 400)
        delay.assert_not_called()
