"""Note processing tasks must not overwrite changes made while they run."""

from unittest.mock import patch

from ..models import Note
from ..tasks import note_metadata_process_task
from .utils import NotesTestCase


class NoteMetadataTaskTest(NotesTestCase):
    def setUp(self):
        super().setUp()
        self.note = Note.objects.create(content="---\ntitle: Old\n---\nbody", author=self.user)

    def run_task_with(self, concurrent_change):
        def infer_metadata(content):
            concurrent_change()
            return 0, {"title": "Old"}

        # The task's lock decorator closes DB connections afterwards, which would end the test transaction.
        with (
            patch("notes.markdown.to_metadata.infer_metadata", side_effect=infer_metadata),
            patch("core.decorators.close_old_connections"),
        ):
            note_metadata_process_task(self.note.id)

    def test_keeps_concurrent_edit(self):
        self.run_task_with(lambda: Note.objects.filter(pk=self.note.pk).update(content="edited"))

        self.note.refresh_from_db()
        self.assertEqual(self.note.content, "edited")
        self.assertEqual(self.note.title, "Old")

    def test_does_not_restore_deleted_note(self):
        self.run_task_with(lambda: Note.objects.filter(pk=self.note.pk).delete())

        self.assertFalse(Note.objects.filter(pk=self.note.pk).exists())
