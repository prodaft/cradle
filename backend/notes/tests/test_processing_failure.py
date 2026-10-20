"""A note must not stay PROCESSING after its processing chain fails."""

import uuid
from unittest.mock import MagicMock, patch

from ..enums import NoteStatus
from ..models import Note
from ..processor.task_scheduler import TaskScheduler
from ..tasks import connect_aliases, entry_class_creation_task, entry_population_task, note_processing_failed_task
from .utils import NotesTestCase


class NoteProcessingFailureTest(NotesTestCase):
    def test_failure_callback_marks_processing_note_invalid(self):
        note = Note.objects.create(author=self.user, content="x", status=NoteStatus.PROCESSING)

        note_processing_failed_task(note.id)

        note.refresh_from_db()
        self.assertEqual(note.status, NoteStatus.INVALID)
        self.assertTrue(note.status_message)

    def test_failure_callback_keeps_other_statuses(self):
        note = Note.objects.create(author=self.user, content="x", status=NoteStatus.INVALID, status_message="kept")

        note_processing_failed_task(note.id)
        note_processing_failed_task(uuid.uuid4())  # deleted note: no error

        note.refresh_from_db()
        self.assertEqual(note.status_message, "kept")

    @patch("notes.processor.task_scheduler.chain")
    def test_pipeline_chain_has_failure_callback(self, chain):
        chain.return_value = MagicMock()
        with self.captureOnCommitCallbacks(execute=False):
            note = TaskScheduler(self.user, content="hello").run_pipeline(validate=False)

        chain.return_value.on_error.assert_called_once_with(note_processing_failed_task.si(note.id))

    @patch("core.decorators.close_old_connections")  # would close the test transaction's connection
    def test_deleted_note_is_not_retried(self, _close):
        for task in (entry_class_creation_task, entry_population_task, connect_aliases):
            with self.subTest(task=task.name), patch.object(task, "retry") as retry:
                with self.assertRaises(Note.DoesNotExist):
                    task(uuid.uuid4())
                retry.assert_not_called()
