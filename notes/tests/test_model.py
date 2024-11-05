from notes.models import Note, ArchivedNote
from entries.models import Entry
from entries.enums import EntryType
from .utils import NotesTestCase


class DeleteNoteTest(NotesTestCase):
    def setUp(self):
        super().setUp()

        self.entity1 = Entry.objects.create(
            name="Entity1", description="Description", entry_class=self.entryclass1
        )
        self.entity2 = Entry.objects.create(
            name="Entity2", description="Description", entry_class=self.entryclass1
        )

        self.note = Note.objects.create(content="Note1")
        self.note.entries.add(self.entity1, self.entity2)

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
