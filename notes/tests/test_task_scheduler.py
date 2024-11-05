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
        self.note = Note(content="note", author=self.user)
        self.note.save()

    def test_has_access_to_referenced_entities(self):
        self.note.entries.add(self.entity1)
        self.note.save()

        foo = AccessControlTask(self.user).run(self.note)
        self.assertIsNone(foo)

    def test_does_not_have_access_to_referenced_entities(self):
        self.note.entries.add(self.entity1)
        self.note.entries.add(self.entity2)
        self.note.save()

        self.assertRaises(
            NoAccessToEntriesException,
            lambda: AccessControlTask(self.user).run(self.note),
        )
