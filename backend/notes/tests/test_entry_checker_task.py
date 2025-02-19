from entries.models import Entry
from notes import utils
from notes.models import Note
from notes.utils import Link
from ..exceptions import EntriesDoNotExistException
from .utils import NotesTestCase
import notes.processor.entry_population_task as task


class EntryPopulationTaskTest(NotesTestCase):
    def setUp(self):
        super().setUp()

        self.saved_entity1 = Entry.objects.create(
            name="entity1", entry_class=self.entryclass1
        )
        self.saved_entity2 = Entry.objects.create(
            name="entity2", entry_class=self.entryclass1
        )

        self.saved_entity1.save()
        self.saved_entity2.save()

        self.note = Note(content="123", author=self.user)
        self.note.save()

    def tearDown(self):
        return super().tearDown()
        task.extract_links = utils.extract_links

    def test_references_existing_entities(self):
        task.extract_links = lambda x: [
            Link("case", "entity1"),
            Link("case", "entity2"),
        ]
        note = task.EntryPopulationTask(self.user).run(self.note)

        self.assertSetEqual(
            set(note.entries.all()), set([self.saved_entity1, self.saved_entity2])
        )

    def test_references_non_existing_entities(self):
        task.extract_links = lambda x: [
            Link("case", "entity1"),
            Link("case", "entity2"),
            Link("case", "other"),
        ]

        self.assertRaises(
            EntriesDoNotExistException,
            lambda: task.EntryPopulationTask(self.user).run(self.note),
        )

    def test_references_no_entities(self):
        task.extract_links = lambda x: []

        note = task.EntryPopulationTask(self.user).run(self.note)

        self.assertIs(note.entries.count(), 0)
