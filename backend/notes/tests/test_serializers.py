from file_transfer.models import FileReference

from ..models import Note
from ..serializers import NoteListSerializer
from .utils import NotesTestCase


class NoteListSerializerTest(NotesTestCase):
    def test_files_do_not_expose_storage_location(self):
        note = Note.objects.create(content="note")
        FileReference.objects.create(note=note, file_name="a.txt")

        files = NoteListSerializer().to_representation(note)["files"]

        self.assertEqual(len(files), 1)
        self.assertEqual(files[0]["name"], "a.txt")
        self.assertNotIn("file", files[0])
