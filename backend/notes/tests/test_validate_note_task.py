from unittest.mock import patch

from access.enums import AccessType
from access.models import Access
from entries.exceptions import NoteReferenceNotAllowedException
from entries.models import Entry

from ..enums import NoteStatus
from ..exceptions import EntriesNotFoundException, EntryTypesNotFoundException
from ..models import Note
from ..processor.task_scheduler import TaskScheduler
from ..processor.validate_note_task import ValidateNoteTask
from .utils import NotesTestCase


class ValidateNoteTaskErrorMessageTest(NotesTestCase):
    def test_internal_link_names_the_entry_type(self):
        note = Note(content="[[case:Missing]] [[ip:10.0.0.1]] [[alias:harbor]]")

        with self.assertRaises(NoteReferenceNotAllowedException) as ctx:
            ValidateNoteTask(self.user).run(note, [])

        self.assertEqual(
            str(ctx.exception.detail),
            "Notes cannot link to these entry types: [[alias:...]]. "
            "This linked entry does not exist: [[case:Missing]].",
        )
        self.assertEqual(
            ctx.exception.link_issues,
            [
                {"code": "not_allowed", "key": "alias", "value": None},
                {"code": "missing_entry", "key": "case", "value": "Missing"},
            ],
        )

    def test_missing_entity_names_the_link(self):
        note = Note(content="[[case:Missing]] [[ip:10.0.0.1]]")

        with self.assertRaises(EntriesNotFoundException) as ctx:
            ValidateNoteTask(self.user).run(note, [])

        self.assertEqual(str(ctx.exception.detail), "This linked entry does not exist: [[case:Missing]].")
        self.assertEqual(ctx.exception.link_issues, [{"code": "missing_entry", "key": "case", "value": "Missing"}])

    def test_every_problem_link_is_reported_at_once(self):
        note = Note(content="[[nope:a]] [[case:Missing]] [[case:Other]] [[nope:b]] [[ip:10.0.0.1]]")

        with self.assertRaises(EntryTypesNotFoundException) as ctx:
            ValidateNoteTask(self.user).run(note, [])

        self.assertEqual(
            str(ctx.exception.detail),
            "The following entry types could not be found: nope. "
            "This linked entry does not exist: [[case:Missing]], [[case:Other]].",
        )
        self.assertEqual(
            ctx.exception.link_issues,
            [
                {"code": "unknown_type", "key": "nope", "value": None},
                {"code": "missing_entry", "key": "case", "value": "Missing"},
                {"code": "missing_entry", "key": "case", "value": "Other"},
            ],
        )


class InvalidNoteSaveTest(NotesTestCase):
    def setUp(self):
        super().setUp()
        self.entity = Entry.objects.create(name="Known", entry_class=self.entryclass1)
        Access.objects.create(user=self.user, entity=self.entity, access_type=AccessType.READ_WRITE)
        self.note = Note.objects.create(author=self.user, content="[[case:Known]] [[ip:10.0.0.1]]", access_vector=0b11)
        self.note.entries.add(self.entity)

    def test_strict_pipeline_rejects_an_invalid_note(self):
        with self.assertRaises(EntriesNotFoundException):
            TaskScheduler(self.user, content="[[case:Known]] [[case:Missing]]").run_pipeline(self.note)

        self.note.refresh_from_db()
        self.assertEqual(self.note.content, "[[case:Known]] [[ip:10.0.0.1]]")

    def test_tolerant_pipeline_saves_an_invalid_note_without_processing_it(self):
        with patch("notes.processor.task_scheduler.chain") as chain:
            TaskScheduler(self.user, content="[[case:Known]] [[case:Missing]]").run_pipeline(
                self.note, allow_invalid=True
            )

        chain.assert_not_called()
        self.note.refresh_from_db()
        self.assertEqual(self.note.content, "[[case:Known]] [[case:Missing]]")
        self.assertEqual(self.note.status, NoteStatus.INVALID)
        self.assertEqual(self.note.status_message, "This linked entry does not exist: [[case:Missing]].")
        self.assertEqual(self.note.status_issues, [{"code": "missing_entry", "key": "case", "value": "Missing"}])
        self.assertEqual(list(self.note.entries.all()), [self.entity])
        # Access only narrows: the old bits stay and the still-linked entity's bit is added.
        self.assertEqual(self.note.access_vector, 0b11 | 1 << self.entity.acvec_offset)
