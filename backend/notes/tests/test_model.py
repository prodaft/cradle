from notes.models import Note
from entries.models import Entry
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
