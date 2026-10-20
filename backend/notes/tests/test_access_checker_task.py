from access.enums import AccessType
from access.models import Access
from entries.models import Entry

from ..exceptions import NoAccessToEntriesException
from ..models import Note
from ..processor.access_control_task import AccessControlTask
from .utils import NotesTestCase


class AccessCheckerTaskTest(NotesTestCase):
    def setUp(self):
        super().setUp()

        self.entity1 = Entry.objects.create(name="entity1", entry_class=self.entryclass1)
        self.entity2 = Entry.objects.create(name="entity2", entry_class=self.entryclass1)

        Access.objects.create(user=self.user, entity=self.entity1, access_type=AccessType.READ_WRITE)
        Access.objects.create(user=self.user, entity=self.entity2, access_type=AccessType.READ)

    def test_has_access_to_referenced_entities(self):
        note = Note(content="123", author=self.user)
        note.save()
        note.entries.add(self.entity1)

        entries = list(note.entries.all())
        result_none, result_entries = AccessControlTask(self.user).run(note, entries)
        self.assertIsNone(result_none)
        self.assertEqual(set(e.id for e in result_entries), {self.entity1.id})

    def test_does_not_have_access_to_referenced_entities(self):
        note = Note(content="123", author=self.user)
        note.save()
        note.entries.add(self.entity1)
        note.entries.add(self.entity2)

        with self.assertRaises(NoAccessToEntriesException):
            AccessControlTask(self.user).run(note, list(note.entries.all()))
