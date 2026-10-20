from entries.exceptions import NoteReferenceNotAllowedException

from ..exceptions import EntriesNotFoundException
from ..models import Note
from ..processor.validate_note_task import ValidateNoteTask
from .utils import NotesTestCase


class ValidateNoteTaskErrorMessageTest(NotesTestCase):
    def test_internal_link_names_the_entry_type(self):
        note = Note(content="[[case:Missing]] [[ip:10.0.0.1]] [[alias:harbor]]")

        with self.assertRaises(NoteReferenceNotAllowedException) as ctx:
            ValidateNoteTask(self.user).run(note, [])

        self.assertEqual(str(ctx.exception.detail), "Notes cannot link to these entry types: [[alias:...]].")

    def test_missing_entity_names_the_link(self):
        note = Note(content="[[case:Missing]] [[ip:10.0.0.1]]")

        with self.assertRaises(EntriesNotFoundException) as ctx:
            ValidateNoteTask(self.user).run(note, [])

        self.assertEqual(str(ctx.exception.detail), "This linked entry does not exist: [[case:Missing]].")
