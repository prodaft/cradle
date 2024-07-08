from entries.models import Entry
from notes.utils.count_references_task import CountReferencesTask
from ..exceptions import NotEnoughReferencesException
from .utils import NotesTestCase


class CountReferencesTaskTest(NotesTestCase):

    def setUp(self):
        super().setUp()

        self.actor_entry1 = Entry(name="actor1", type="actor")
        self.actor_entry2 = Entry(name="actor2", type="actor")
        self.case_entry1 = Entry(name="case1", type="case")
        self.case_entry2 = Entry(name="case2", type="case")

        self.referenced_entries = {}
        self.entry_types = ["actor", "case", "artifact", "metadata"]
        for t in self.entry_types:
            self.referenced_entries[t] = set()

    def test_references_case_and_other_entry(self):
        self.referenced_entries["actor"] = {self.actor_entry1}
        self.referenced_entries["case"] = {self.case_entry1}

        new_referenced_entries = CountReferencesTask().run(self.referenced_entries)
        self.assertEqual(self.referenced_entries, new_referenced_entries)

    def test_references_multiple_cases(self):
        self.referenced_entries["case"] = {self.case_entry1, self.case_entry2}

        new_referenced_entries = CountReferencesTask().run(self.referenced_entries)
        self.assertEqual(self.referenced_entries, new_referenced_entries)

    def test_references_one_case(self):
        self.referenced_entries["case"] = {self.case_entry1}

        self.assertRaises(
            NotEnoughReferencesException,
            lambda: CountReferencesTask().run(self.referenced_entries),
        )

    def test_references_multiple_entries_no_case(self):
        self.referenced_entries["actor"] = {self.actor_entry1, self.actor_entry2}

        self.assertRaises(
            NotEnoughReferencesException,
            lambda: CountReferencesTask().run(self.referenced_entries),
        )

    def test_references_no_references(self):
        self.assertRaises(
            NotEnoughReferencesException,
            lambda: CountReferencesTask().run(self.referenced_entries),
        )
