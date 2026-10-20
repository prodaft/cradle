"""Relinking runs in the background, one locked note per transaction."""

from unittest.mock import patch

from django.contrib.contenttypes.models import ContentType
from django.urls import reverse
from rest_framework.test import APIClient

from entries.enums import RelationReason
from entries.models import Entry, Relation
from user.models import UserRoles
from user.testing import session_access_token

from ..enums import NoteStatus
from ..models import Note
from ..processor.task_scheduler import TaskScheduler
from ..tasks import relink_all_notes_task, relink_note_task
from .utils import NotesTestCase


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

        with self.captureOnCommitCallbacks(execute=False):
            relink_note_task(self.note.id, self.user.id)

        self.note.refresh_from_db()
        self.assertEqual(self.note.content, "edited meanwhile")
        self.assertEqual(self.note.status, NoteStatus.PROCESSING)
        self.assertFalse(Relation.objects.filter(pk=self.relation.pk).exists())

    def test_failed_relink_keeps_relations(self):
        with patch.object(TaskScheduler, "run_pipeline", side_effect=RuntimeError("boom")):
            with self.assertRaises(RuntimeError):
                relink_note_task(self.note.id, self.user.id)

        self.assertTrue(Relation.objects.filter(pk=self.relation.pk).exists())

    def test_fleeting_and_missing_notes_are_skipped(self):
        fleeting = Note.objects.create(author=self.user, content="f", fleeting=True)
        with patch.object(TaskScheduler, "run_pipeline") as run:
            relink_note_task(fleeting.id, self.user.id)
            relink_note_task("00000000-0000-0000-0000-000000000000", self.user.id)
        run.assert_not_called()

    @patch("notes.tasks.relink_note_task.delay")
    def test_relink_all_queues_one_task_per_note(self, delay):
        Note.objects.create(author=self.user, content="f", fleeting=True)
        other = Note.objects.create(author=self.user, content="second")

        relink_all_notes_task(self.user.id)

        self.assertCountEqual([c.args[0] for c in delay.call_args_list], [self.note.id, other.id])
