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

        self.case1 = Entry.objects.create(name="case1", type=EntryType.CASE)
        self.case2 = Entry.objects.create(name="case2", type=EntryType.CASE)
        self.actor = Entry.objects.create(name="actor", type=EntryType.ACTOR)

        Access.objects.create(
            user=self.user, case=self.case1, access_type=AccessType.READ_WRITE
        )
        Access.objects.create(
            user=self.user, case=self.case2, access_type=AccessType.READ
        )

        self.referenced_entries = {}
        self.entry_types = ["actor", "case", "artifact", "metadata"]
        for t in self.entry_types:
            self.referenced_entries[t] = set()
        self.referenced_entries["actor"] = {self.actor}

    def test_has_access_to_referenced_cases(self):
        self.referenced_entries["case"] = {self.case1}

        newly_returned_entries = AccessCheckerTask(self.user).run(
            self.referenced_entries
        )
        self.assertEqual(self.referenced_entries, newly_returned_entries)

    def test_does_not_have_access_to_referenced_cases(self):
        self.referenced_entries["case"] = {self.case1, self.case2}

        self.assertRaises(
            NoAccessToEntriesException,
            lambda: AccessCheckerTask(self.user).run(self.referenced_entries),
        )
