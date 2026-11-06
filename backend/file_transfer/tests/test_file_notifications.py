"""Uploaders hear when a file cannot be processed; reprocessing all files reports to the admin instead."""

from unittest.mock import patch

from django.test import TestCase

from notifications.models import MessageNotification
from user.models import CradleUser

from ..enums import FileProcessOutcome
from ..models import FileReference
from ..tasks import files_reprocessed_task, process_file_task, reprocess_all_files_task


class FileNotificationTest(TestCase):
    def setUp(self):
        self.patcher = patch("file_transfer.s3_utils.ensure_all_buckets_exist")
        self.patcher.start()
        self.owner = CradleUser.objects.create_user(username="owner", password="pw", email="owner@x.y")
        with patch("file_transfer.models.FileReference.process_file"):
            self.file = FileReference.objects.create(file_name="a.txt", user=self.owner)

    def tearDown(self):
        self.patcher.stop()
        super().tearDown()

    def messages(self, user):
        return list(MessageNotification.objects.filter(user=user).values_list("message", flat=True))

    def test_failed_processing_tells_the_uploader(self):
        outcome = process_file_task(str(self.file.id))

        self.assertEqual(outcome, FileProcessOutcome.FAILED)
        self.assertEqual(
            self.messages(self.owner), ['The file "a.txt" could not be fully processed: it has no stored file.']
        )

    def test_failure_is_not_told_when_the_admin_gets_a_summary(self):
        outcome = process_file_task(str(self.file.id), notify_owner=False)

        self.assertEqual(outcome, FileProcessOutcome.FAILED)
        self.assertEqual(self.messages(self.owner), [])

    def test_unexpected_error_counts_as_a_failure(self):
        with patch("file_transfer.tasks._process_file", side_effect=RuntimeError("boom")):
            outcome = process_file_task(str(self.file.id))

        self.assertEqual(outcome, FileProcessOutcome.FAILED)
        self.assertEqual(
            self.messages(self.owner),
            ['The file "a.txt" could not be fully processed: an unexpected error occurred.'],
        )

    def test_deleted_file_is_skipped(self):
        self.assertEqual(process_file_task("00000000-0000-0000-0000-000000000000"), FileProcessOutcome.SKIPPED)

    @patch("file_transfer.tasks.chord")
    def test_reprocess_all_waits_on_every_file_without_telling_uploaders(self, chord):
        reprocess_all_files_task(self.owner.id)

        header = list(chord.call_args.args[0])
        self.assertEqual([s.args[0] for s in header], [str(self.file.id)])
        self.assertEqual([s.kwargs for s in header], [{"notify_owner": False}])

    def test_reprocess_all_summary(self):
        outcomes = [FileProcessOutcome.PROCESSED, FileProcessOutcome.PROCESSED, FileProcessOutcome.FAILED]

        files_reprocessed_task(outcomes, self.owner.id)

        self.assertEqual(
            self.messages(self.owner), ["Reprocess All Files finished for 3 files: 2 processed, 1 failed."]
        )
