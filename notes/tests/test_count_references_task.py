from entries.models import Entry
from notes.utils.count_references_task import CountReferencesTask
from ..exceptions import NotEnoughReferencesException
from .utils import NotesTestEntity


class CountReferencesTaskTest(NotesTestEntity):

    def setUp(self):
        super().setUp()

        self.actor_entry1 = Entry(name="actor1", type="actor")
        self.actor_entry2 = Entry(name="actor2", type="actor")
        self.entity_entry1 = Entry(name="entity1", type="entity")
        self.entity_entry2 = Entry(name="entity2", type="entity")

        self.referenced_entries = {}
        self.entry_types = ["actor", "entity", "artifact", "metadata"]
        for t in self.entry_types:
            self.referenced_entries[t] = set()

    def test_references_entity_and_other_entry(self):
        self.referenced_entries["actor"] = {self.actor_entry1}
        self.referenced_entries["entity"] = {self.entity_entry1}

        new_referenced_entries = CountReferencesTask().run(self.referenced_entries)
        self.assertEqual(self.referenced_entries, new_referenced_entries)

    def test_references_multiple_entities(self):
        self.referenced_entries["entity"] = {self.entity_entry1, self.entity_entry2}

        new_referenced_entries = CountReferencesTask().run(self.referenced_entries)
        self.assertEqual(self.referenced_entries, new_referenced_entries)

    def test_references_one_entity(self):
        self.referenced_entries["entity"] = {self.entity_entry1}

        self.assertRaises(
            NotEnoughReferencesException,
            lambda: CountReferencesTask().run(self.referenced_entries),
        )

    def test_references_multiple_entries_no_entity(self):
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
