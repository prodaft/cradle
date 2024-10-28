from entries.models import Entry
from entries.enums import EntryType
from notes.utils.entry_checker_task import EntryCheckerTask
from ..exceptions import EntriesDoNotExistException
from .utils import NotesTestCase


class EntryCheckerTaskTest(NotesTestCase):

    def setUp(self):
        super().setUp()

        self.saved_entity1 = Entry.objects.create(name="entity1", type=EntryType.ENTITY)
        self.entity1 = Entry(name="entity1", type=EntryType.ENTITY)
        self.saved_entity2 = Entry.objects.create(name="entity2", type=EntryType.ENTITY)
        self.entity2 = Entry(name="entity2", type=EntryType.ENTITY)
        self.other_entity = Entry(name="other entity", type=EntryType.ENTITY)

        self.referenced_entries = {}
        self.entry_types = ["entity", "artifact"]
        for t in self.entry_types:
            self.referenced_entries[t] = set()

    def test_references_existing_entities(self):
        self.referenced_entries["entity"] = {self.entity1, self.entity2}

        updated_referenced_entries = EntryCheckerTask().run(self.referenced_entries)

        with self.subTest(entry_type="entity"):
            self.assertEqual(
                updated_referenced_entries["entity"],
                {self.saved_entity1, self.saved_entity2},
            )

    def test_references_non_existing_entities(self):
        self.referenced_entries["entity"] = {self.entity1, self.entity2, self.other_entity}

        self.assertRaises(
            EntriesDoNotExistException,
            lambda: EntryCheckerTask().run(self.referenced_entries),
        )

    def test_references_no_entities(self):
        self.referenced_entries["entity"] = {}

        updated_referenced_entries = EntryCheckerTask().run(self.referenced_entries)

        with self.subTest(entry_type="entity"):
            self.assertEqual(updated_referenced_entries["entity"], set())
