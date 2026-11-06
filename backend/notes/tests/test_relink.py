"""Relinking runs in the background, one locked note per transaction."""

from unittest.mock import patch

from celery.result import EagerResult
from django.contrib.contenttypes.models import ContentType
from django.urls import reverse
from rest_framework.test import APIClient

from entries.enums import RelationReason
from entries.models import Entry, Relation
from notifications.models import MessageNotification
from user.models import UserRoles
from user.testing import session_access_token

from ..enums import NoteStatus, RelinkOutcome
from ..models import Note
from ..processor.task_scheduler import TaskScheduler
from ..tasks import relink_all_notes_finished_task, relink_all_notes_task, relink_note_task
from .utils import NotesTestCase

SUCCEEDED = EagerResult("id", None, "SUCCESS")


class RelinkTest(NotesTestCase):
    def setUp(self):
        super().setUp()
        self.user.role = UserRoles.ADMIN
        self.user.save(update_fields=["role"])
        self.client = APIClient()
        self.headers = {"HTTP_COOKIE": f"access_token={session_access_token(self.user)}"}
        self.note = Note.objects.create(author=self.user, content="original", status=NoteStatus.HEALTHY)
        a = Entry.objects.create(name="a", entry_class=self.entryclass1)
        b = Entry.objects.create(name="b", entry_class=self.entryclass1)
        self.relation = Relation.objects.create(
            e1=a,
            e2=b,
            content_type=ContentType.objects.get_for_model(Note),
            object_id=self.note.id,
            reason=RelationReason.NOTE,
            access_vector=1,
        )

    @patch("notes.views.note_view.relink_note_task.delay")
    def test_relink_endpoint_queues_task(self, delay):
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post(reverse("note_relink", kwargs={"note_id": self.note.id}), **self.headers)

        self.assertEqual(response.status_code, 202, response.content)
        delay.assert_called_once_with(self.note.id, self.user.id)
        self.assertTrue(Relation.objects.filter(pk=self.relation.pk).exists())

    @patch("notes.views.note_view.relink_all_notes_task.delay")
    def test_relink_all_endpoint_queues_task(self, delay):
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post(reverse("note_relink_all"), **self.headers)

        self.assertEqual(response.status_code, 202, response.content)
        delay.assert_called_once_with(self.user.id)

    def test_task_rebuilds_from_current_content(self):
        Note.objects.filter(pk=self.note.pk).update(content="edited meanwhile")

        with patch("celery.canvas.Signature.apply", return_value=SUCCEEDED):
            outcome = relink_note_task(self.note.id, self.user.id)

        self.assertEqual(outcome, RelinkOutcome.RELINKED)
        self.note.refresh_from_db()
        self.assertEqual(self.note.content, "edited meanwhile")
        self.assertEqual(self.note.status, NoteStatus.PROCESSING)
        self.assertFalse(Relation.objects.filter(pk=self.relation.pk).exists())

    def test_note_with_bad_links_keeps_its_relations_and_gets_its_issues(self):
        Note.objects.filter(pk=self.note.pk).update(content="[[case:a]] [[case:Missing]]")

        with self.captureOnCommitCallbacks(execute=False):
            outcome = relink_note_task(self.note.id, self.user.id)

        self.assertEqual(outcome, RelinkOutcome.INVALID)
        self.note.refresh_from_db()
        self.assertEqual(self.note.status, NoteStatus.INVALID)
        self.assertEqual(self.note.status_issues, [{"code": "missing_entry", "key": "case", "value": "Missing"}])
        self.assertTrue(Relation.objects.filter(pk=self.relation.pk).exists())

    def test_failed_relink_keeps_relations(self):
        with patch.object(TaskScheduler, "run_pipeline", side_effect=RuntimeError("boom")):
            outcome = relink_note_task(self.note.id, self.user.id)

        self.assertEqual(outcome, RelinkOutcome.FAILED)
        self.assertTrue(Relation.objects.filter(pk=self.relation.pk).exists())

    def test_processing_failure_marks_the_note_invalid(self):
        with patch("celery.canvas.Signature.apply", side_effect=RuntimeError("boom")):
            outcome = relink_note_task(self.note.id, self.user.id)

        self.assertEqual(outcome, RelinkOutcome.FAILED)
        self.note.refresh_from_db()
        self.assertEqual(self.note.status, NoteStatus.INVALID)
        # The admin relinking gets a summary; the note's editor is not told about each failure.
        self.assertFalse(MessageNotification.objects.filter(user=self.user).exists())

    def test_failure_after_an_eager_retry_is_not_swallowed(self):
        failed = EagerResult("id", RuntimeError("boom"), "FAILURE")
        with patch("celery.canvas.Signature.apply", return_value=failed):
            outcome = relink_note_task(self.note.id, self.user.id)

        self.assertEqual(outcome, RelinkOutcome.FAILED)
        self.note.refresh_from_db()
        self.assertEqual(self.note.status, NoteStatus.INVALID)

    def test_processing_runs_in_the_relink_task(self):
        # Commit callbacks run as the capture exits, inside the patches, so a queued chain would hit apply_async.
        with (
            patch("celery.canvas.Signature.apply", return_value=SUCCEEDED) as apply,
            patch("celery.canvas.Signature.apply_async") as apply_async,
            self.captureOnCommitCallbacks(execute=True),
        ):
            outcome = relink_note_task(self.note.id, self.user.id)

        self.assertEqual(outcome, RelinkOutcome.RELINKED)

        self.assertEqual(apply.call_count, 7)
        apply_async.assert_not_called()

    def test_fleeting_and_missing_notes_are_skipped(self):
        fleeting = Note.objects.create(author=self.user, content="f", fleeting=True)
        with patch.object(TaskScheduler, "run_pipeline") as run:
            outcomes = [
                relink_note_task(fleeting.id, self.user.id),
                relink_note_task("00000000-0000-0000-0000-000000000000", self.user.id),
            ]
        run.assert_not_called()
        self.assertEqual(outcomes, [RelinkOutcome.SKIPPED, RelinkOutcome.SKIPPED])

    @patch("notes.tasks.chord")
    def test_relink_all_waits_on_one_task_per_note(self, chord):
        Note.objects.create(author=self.user, content="f", fleeting=True)
        other = Note.objects.create(author=self.user, content="second")

        relink_all_notes_task(self.user.id)

        header = list(chord.call_args.args[0])
        self.assertCountEqual([s.args[0] for s in header], [self.note.id, other.id])
        self.assertEqual(chord.return_value.call_args.args[0].task, "notes.tasks.relink_all_notes_finished_task")

    @patch("entries.tasks.refresh_edges_materialized_view")
    def test_relink_all_callback_refreshes_graph_then_reports_outcomes(self, refresh):
        outcomes = [RelinkOutcome.RELINKED, RelinkOutcome.RELINKED, RelinkOutcome.INVALID]

        relink_all_notes_finished_task(outcomes, self.user.id)

        refresh.assert_called_once_with()
        message = MessageNotification.objects.get(user=self.user).message
        self.assertEqual(message, "Re-Link All Notes finished for 3 notes: 2 re-linked, 1 invalid.")
