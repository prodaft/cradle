from entries.models import Entry
from notes.models import Note
from notes.processor.access_control_task import AccessControlTask
from access.models import Access
from access.enums import AccessType
from ..exceptions import NoAccessToEntriesException
from .utils import NotesTestCase


class AccessCheckerTaskTest(NotesTestCase):
    def setUp(self):
        super().setUp()

        self.entity1 = Entry.objects.create(
            name="entity1", entry_class=self.entryclass1
        )
        self.entity2 = Entry.objects.create(
            name="entity2", entry_class=self.entryclass1
        )

        Access.objects.create(
            user=self.user, entity=self.entity1, access_type=AccessType.READ_WRITE
        )
        Access.objects.create(
            user=self.user, entity=self.entity2, access_type=AccessType.READ
        )

        self.referenced_entries = {}
        self.entry_types = ["entity", "artifact"]
        for t in self.entry_types:
            self.referenced_entries[t] = set()

    def test_has_access_to_referenced_entities(self):
        note = Note(content="123", author=self.user)
        note.save()
        note.entries.add(self.entity1)

        _, newly_returned_entries = AccessControlTask(self.user).run(
            note, list(note.entries.all())
        )

    def test_does_not_have_access_to_referenced_entities(self):
        note = Note(content="123", author=self.user)
        note.save()
        note.entries.add(self.entity1)
        note.entries.add(self.entity2)

        self.assertRaises(
            NoAccessToEntriesException,
            lambda: AccessControlTask(self.user).run(note, list(note.entries.all())),
        )
