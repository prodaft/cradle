from entries.models import Entry
from notes import utils
from notes.models import Note
from notes.utils import Link
from .utils import NotesTestCase
import notes.processor.entry_population_task as task


class EntryCreationTaskTest(NotesTestCase):
    def setUp(self):
        super().setUp()

        self.saved_actor = Entry.objects.create(
            name="actor", entry_class=self.entryclass2
        )
        self.saved_entity = Entry.objects.create(
            name="entity", entry_class=self.entryclass1
        )
        self.saved_actor.save()
        self.saved_entity.save()

        self.saved_metadata = Entry.objects.create(
            name="Romania", entry_class=self.entryclass_country
        )

        self.unsaved_metadata = Entry.objects.create(
            name="Turkey", entry_class=self.entryclass_country
        )

        self.saved_artifact = Entry.objects.create(
            name="127.0.0.1", entry_class=self.entryclass_ip
        )

        self.saved_metadata.save()

    def tearDown(self):
        return super().tearDown()
        task.extract_links = utils.extract_links

    def test_save_entries(self):
        task.extract_links = lambda x: [
            Link("actor", "actor"),
            Link("case", "entity"),
            Link("country", "Turkey"),
            Link("country", "Romania"),
        ]

        note = Note(content="123", author=self.user)
        note.save()

        note = task.EntryPopulationTask(self.user).run(note)

        self.assertSetEqual(
            set(note.entries.all()),
            set(
                [
                    self.saved_actor,
                    self.saved_entity,
                    self.saved_metadata,
                    self.unsaved_metadata,
                ]
            ),
        )
