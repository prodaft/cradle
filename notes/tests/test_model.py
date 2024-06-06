from notes.models import Note, ArchivedNote
from entities.models import Entity
from entities.enums import EntityType
from .utils import NotesTestCase


class DeleteNoteTest(NotesTestCase):

    def setUp(self):
        super().setUp()

        self.case1 = Entity.objects.create(
            name="Case1", description="Description", type=EntityType.CASE
        )
        self.case2 = Entity.objects.create(
            name="Case2", description="Description", type=EntityType.CASE
        )

        self.note = Note.objects.create(content="Note1")
        self.note.entities.add(self.case1, self.case2)

    def test_delete_note(self):
        self.note.delete()

        with self.subTest("Note is deleted"):
            self.assertEqual(Note.objects.count(), 0)

        with self.subTest("Chenck note is archived"):
            self.assertEqual(ArchivedNote.objects.count(), 1)

        archived_note = ArchivedNote.objects.first()

        with self.subTest("Check content of archived note"):
            self.assertEqual(archived_note.content, self.note.content)

        with self.subTest("Check publishable status of archived note"):
            self.assertEqual(archived_note.publishable, self.note.publishable)

        with self.subTest("Check timestamp of archived note"):
            self.assertEqual(archived_note.timestamp, self.note.timestamp)
