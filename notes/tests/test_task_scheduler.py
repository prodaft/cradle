from entries.models import Entry
from entries.enums import EntryType
from notes.utils.access_checker_task import AccessCheckerTask
from user.models import CradleUser
from access.models import Access
from access.enums import AccessType
from ..exceptions import NoAccessToEntriesException
from .utils import NotesTestCase


class AccessCheckerTaskTest(NotesTestCase):
    def setUp(self):
        super().setUp()

        self.user = CradleUser.objects.create_user(
            username="user", password="user", email="alabala@gmail.com"
        )

        self.entity1 = Entry.objects.create(name="entity1", type=EntryType.ENTITY)
        self.entity2 = Entry.objects.create(name="entity2", type=EntryType.ENTITY)

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
        self.referenced_entries["entity"] = {self.entity1}

        newly_returned_entries = AccessCheckerTask(self.user).run(
            self.referenced_entries
        )
        self.assertEqual(self.referenced_entries, newly_returned_entries)

    def test_does_not_have_access_to_referenced_entities(self):
        self.referenced_entries["entity"] = {self.entity1, self.entity2}

        self.assertRaises(
            NoAccessToEntriesException,
            lambda: AccessCheckerTask(self.user).run(self.referenced_entries),
        )
