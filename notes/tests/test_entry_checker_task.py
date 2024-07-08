from entries.models import Entry
from entries.enums import EntryType
from notes.utils.entry_checker_task import EntryCheckerTask
from ..exceptions import EntriesDoNotExistException
from .utils import NotesTestCase


class EntryCheckerTaskTest(NotesTestCase):

    def setUp(self):
        super().setUp()

        self.saved_actor1 = Entry.objects.create(name="actor1", type=EntryType.ACTOR)
        self.actor1 = Entry(name="actor1", type=EntryType.ACTOR)
        self.saved_actor2 = Entry.objects.create(name="actor2", type=EntryType.ACTOR)
        self.actor2 = Entry(name="actor2", type=EntryType.ACTOR)
        self.other_actor = Entry(name="other actor", type=EntryType.ACTOR)

        self.saved_case1 = Entry.objects.create(name="case1", type=EntryType.CASE)
        self.case1 = Entry(name="case1", type=EntryType.CASE)
        self.saved_case2 = Entry.objects.create(name="case2", type=EntryType.CASE)
        self.case2 = Entry(name="case2", type=EntryType.CASE)
        self.other_case = Entry(name="other case", type=EntryType.CASE)

        self.referenced_entries = {}
        self.entry_types = ["actor", "case", "artifact", "metadata"]
        for t in self.entry_types:
            self.referenced_entries[t] = set()

    def test_references_existing_cases_and_actors(self):
        self.referenced_entries["actor"] = {self.actor1, self.actor2}
        self.referenced_entries["case"] = {self.case1, self.case2}

        updated_referenced_entries = EntryCheckerTask().run(self.referenced_entries)

        with self.subTest(entry_type="actor"):
            self.assertEqual(
                updated_referenced_entries["actor"],
                {self.saved_actor1, self.saved_actor2},
            )
        with self.subTest(entry_type="case"):
            self.assertEqual(
                updated_referenced_entries["case"],
                {self.saved_case1, self.saved_case2},
            )

    def test_references_non_existing_cases(self):
        self.referenced_entries["actor"] = {self.actor1, self.actor2}
        self.referenced_entries["case"] = {self.case1, self.case2, self.other_case}

        self.assertRaises(
            EntriesDoNotExistException,
            lambda: EntryCheckerTask().run(self.referenced_entries),
        )

    def test_references_non_existing_actors(self):
        self.referenced_entries["actor"] = {self.actor1, self.actor2, self.other_actor}
        self.referenced_entries["case"] = {self.case1}

        self.assertRaises(
            EntriesDoNotExistException,
            lambda: EntryCheckerTask().run(self.referenced_entries),
        )

    def test_references_non_existing_both(self):
        self.referenced_entries["actor"] = {self.other_actor}
        self.referenced_entries["case"] = {self.other_case}

        self.assertRaises(
            EntriesDoNotExistException,
            lambda: EntryCheckerTask().run(self.referenced_entries),
        )

    def test_references_no_actors_or_cases(self):
        self.referenced_entries["actor"] = {}
        self.referenced_entries["case"] = {}

        updated_referenced_entries = EntryCheckerTask().run(self.referenced_entries)

        with self.subTest(entry_type="actor"):
            self.assertEqual(updated_referenced_entries["actor"], set())
        with self.subTest(entry_type="case"):
            self.assertEqual(updated_referenced_entries["case"], set())
