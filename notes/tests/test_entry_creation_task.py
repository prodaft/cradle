from entries.models import Entry
from entries.enums import EntryType, EntrySubtype
from notes.utils.entry_creation_task import EntryCreationTask
from .utils import NotesTestCase


class EntryCreationTaskTest(NotesTestCase):

    def setUp(self):
        super().setUp()

        self.saved_actor = Entry.objects.create(name="actor", type=EntryType.ACTOR)
        self.saved_case = Entry.objects.create(name="case", type=EntryType.CASE)

        self.saved_metadata = Entry.objects.create(
            name="Romania", type=EntryType.METADATA, subtype=EntrySubtype.COUNTRY
        )
        self.metadata = Entry(
            name="Romania", type=EntryType.METADATA, subtype=EntrySubtype.COUNTRY
        )

        self.saved_artifact = Entry.objects.create(
            name="127.0.0.1", type=EntryType.ARTIFACT, subtype=EntrySubtype.IP
        )
        self.artifact = Entry(
            name="127.0.0.1", type=EntryType.ARTIFACT, subtype=EntrySubtype.IP
        )

        self.referenced_entries = {}
        self.entry_types = ["actor", "case", "artifact", "metadata"]
        for t in self.entry_types:
            self.referenced_entries[t] = set()
        self.referenced_entries["actor"] = {self.saved_actor}
        self.referenced_entries["case"] = {self.saved_case}

    def references_assertions(
        self, refs, actors=set(), cases=set(), artifacts=set(), metadata=set()
    ):
        self.assertEqual(refs["actor"], actors)
        self.assertEqual(refs["case"], cases)
        self.assertEqual(refs["artifact"], artifacts)
        self.assertEqual(refs["metadata"], metadata)

    def test_retrieve_entries(self):
        self.referenced_entries["artifact"] = {self.artifact}
        self.referenced_entries["metadata"] = {self.metadata}

        returned_referenced_entries = EntryCreationTask().run(
            self.referenced_entries
        )

        self.references_assertions(
            returned_referenced_entries,
            actors={self.saved_actor},
            artifacts={self.saved_artifact},
            cases={self.saved_case},
            metadata={self.saved_metadata},
        )

    def test_save_entries(self):
        new_artifact = Entry(
            name="1234", type=EntryType.ARTIFACT, subtype=EntrySubtype.PASSWORD
        )
        # this actor should not be saved
        new_actor = Entry(name="other-actor", type=EntryType.ACTOR)

        self.referenced_entries["actor"] = {self.saved_actor, new_actor}
        self.referenced_entries["artifact"] = {new_artifact}

        returned_referenced_entries = EntryCreationTask().run(
            self.referenced_entries
        )

        newly_created_artifact = Entry.objects.get(
            name=new_artifact.name, type=new_artifact.type, subtype=new_artifact.subtype
        )

        self.references_assertions(
            returned_referenced_entries,
            actors={self.saved_actor, new_actor},
            artifacts={newly_created_artifact},
            cases={self.saved_case},
        )

        # assert that the new actor is not saved
        self.assertFalse(
            Entry.objects.filter(name="other-actor", type=EntryType.ACTOR).exists()
        )
