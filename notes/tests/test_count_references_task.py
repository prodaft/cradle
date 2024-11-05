from entries.models import Entry
from notes.models import Note
from notes.processor.count_references_task import CountReferencesTask
from ..exceptions import NotEnoughReferencesException
from .utils import NotesTestCase


class CountReferencesTaskTest(NotesTestCase):
    def setUp(self):
        super().setUp()

        self.actor_entry1 = Entry(name="actor1", entry_class=self.entryclass2)
        self.actor_entry2 = Entry(name="actor2", entry_class=self.entryclass2)
        self.entity_entry1 = Entry(name="entity1", entry_class=self.entryclass1)
        self.entity_entry2 = Entry(name="entity2", entry_class=self.entryclass1)

        self.actor_entry1.save()
        self.actor_entry2.save()
        self.entity_entry1.save()
        self.entity_entry2.save()

        self.note = Note(content="Note1", author=self.user)

    def test_references_entity_and_other_entry(self):
        self.note.entries.add(self.actor_entry1)
        self.note.entries.add(self.entity_entry1)
        self.note.save()

        out = CountReferencesTask(self.user).run(self.note)
        self.assertIsNone(out)

    def test_references_multiple_entities(self):
        self.note.entries.add(self.entity_entry1)
        self.note.entries.add(self.entity_entry2)
        self.note.save()

        out = CountReferencesTask(self.user).run(self.note)
        self.assertIsNone(out)

    def test_references_one_entity(self):
        self.note.entries.add(self.entity_entry1)
        self.note.save()

        self.assertRaises(
            NotEnoughReferencesException,
            lambda: CountReferencesTask(self.user).run(self.note),
        )

    def test_references_multiple_entries_no_entity(self):
        self.note.entries.add(self.actor_entry1)
        self.note.entries.add(self.actor_entry2)
        self.note.save()

        self.assertRaises(
            NotEnoughReferencesException,
            lambda: CountReferencesTask(self.user).run(self.note),
        )

    def test_references_no_references(self):
        self.note.save()
        self.assertRaises(
            NotEnoughReferencesException,
            lambda: CountReferencesTask(self.user).run(self.note),
        )
