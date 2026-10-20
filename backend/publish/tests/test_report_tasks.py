"""Report generation must not re-create deleted reports; deletion must not drop the published file."""

from unittest.mock import MagicMock, PropertyMock, patch

from django.db.models.fields.files import FieldFile
from django.test import TestCase
from django.urls import reverse

from notifications.models import MessageNotification
from user.models import CradleUser
from user.testing import session_access_token

from ..models import DownloadStrategies, PublishedReport, ReportStatus
from ..strategies.base import BasePublishStrategy
from ..tasks import generate_report


class ReportTasksTest(TestCase):
    def setUp(self):
        self.patcher = patch("file_transfer.s3_utils.ensure_cradle_buckets_exist")
        self.patcher.start()
        self.user = CradleUser.objects.create_user(
            username="user", password="user", email="user@example.com", is_active=True, email_confirmed=True
        )
        self.report = PublishedReport.objects.create(user=self.user, title="Report", strategy=DownloadStrategies.HTML)

    def tearDown(self):
        self.patcher.stop()
        super().tearDown()

    def delete_report(self, *args):
        PublishedReport.objects.filter(pk=self.report.pk).delete()
        return True

    def test_generate_report_marks_done(self):
        publisher = MagicMock(create_report=MagicMock(return_value=True))
        with patch.object(PublishedReport, "publisher", new_callable=PropertyMock, return_value=publisher):
            generate_report(self.report.id)

        self.report.refresh_from_db()
        self.assertEqual(self.report.status, ReportStatus.DONE)
        self.assertTrue(MessageNotification.objects.filter(user=self.user).exists())

    def test_report_deleted_during_generation_stays_deleted(self):
        publisher = MagicMock(create_report=MagicMock(side_effect=self.delete_report))
        with patch.object(PublishedReport, "publisher", new_callable=PropertyMock, return_value=publisher):
            generate_report(self.report.id)

        self.assertFalse(PublishedReport.objects.filter(pk=self.report.pk).exists())
        self.assertFalse(MessageNotification.objects.filter(user=self.user).exists())

    def test_upload_for_deleted_report_is_removed(self):
        def save(file, name, content, save=True):
            file.name = name

        PublishedReport.objects.filter(pk=self.report.pk).delete()
        with (
            patch.object(FieldFile, "save", autospec=True, side_effect=save),
            patch.object(FieldFile, "delete", autospec=True) as delete,
        ):
            saved = BasePublishStrategy(False)._save_report_file(b"report", "report.html", self.report)

        self.assertFalse(saved)
        delete.assert_called_once()
        self.assertFalse(PublishedReport.objects.filter(pk=self.report.pk).exists())


class ReportDeleteTest(TestCase):
    def setUp(self):
        self.patcher = patch("file_transfer.s3_utils.ensure_cradle_buckets_exist")
        self.patcher.start()
        user = CradleUser.objects.create_user(
            username="user", password="user", email="user@example.com", is_active=True, email_confirmed=True
        )
        self.headers = {"HTTP_COOKIE": f"access_token={session_access_token(user)}"}
        self.report = PublishedReport.objects.create(user=user, title="Report", strategy=DownloadStrategies.HTML)
        self.url = reverse("report_detail", kwargs={"report_id": self.report.id})

    def tearDown(self):
        self.patcher.stop()
        super().tearDown()

    def test_failed_file_delete_keeps_report(self):
        with patch.object(BasePublishStrategy, "delete_report", return_value=False):
            response = self.client.delete(self.url, **self.headers)

        self.assertEqual(response.status_code, 500)
        self.assertTrue(PublishedReport.objects.filter(pk=self.report.pk).exists())

    def test_delete_removes_report(self):
        with patch.object(BasePublishStrategy, "delete_report", return_value=True):
            response = self.client.delete(self.url, **self.headers)

        self.assertEqual(response.status_code, 204)
        self.assertFalse(PublishedReport.objects.filter(pk=self.report.pk).exists())
