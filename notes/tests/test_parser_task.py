from notes.utils.parser_task import ParserTask
from entries.models import Entry
from .utils import NotesTestCase

from uuid import UUID


class ParserTaskTest(NotesTestCase):
    def setUp(self):
        super().setUp()

        self.actor_pattern = "[[actor:actor|alias]]"
        self.case_pattern = "[[case:case|alias]]"
        self.artifact_pattern = "[[ip:127.0.0.1|alias]]"
        self.metadata_pattern = "[[country:Romania|alias]]"

        self.actor_entry = Entry(id=UUID(int=0), name="actor", type="actor")
        self.case_entry = Entry(id=UUID(int=0), name="case", type="case")
        self.artifact_entry = Entry(
            id=UUID(int=0), name="127.0.0.1", type="artifact", subtype="ip"
        )
        self.metadata_entry = Entry(
            id=UUID(int=0), name="Romania", type="metadata", subtype="country"
        )

    def references_assertions(
        self, refs, actors=set(), cases=set(), artifacts=set(), metadata=set()
    ):
        self.assertEqual(refs["actor"], actors)
        self.assertEqual(refs["case"], cases)
        self.assertEqual(refs["artifact"], artifacts)
        self.assertEqual(refs["metadata"], metadata)

    def test_no_referenced_entries(self):
        note_content = "Lorem ipsum dolor sit amet."
        refs = ParserTask().run(note_content)
        self.references_assertions(refs)

    def test_reference_each_type(self):
        note_content = (
            self.actor_pattern
            + self.case_pattern
            + self.artifact_pattern
            + self.metadata_pattern
        )
        refs = ParserTask().run(note_content)
        self.references_assertions(
            refs,
            actors={self.actor_entry},
            cases={self.case_entry},
            artifacts={self.artifact_entry},
            metadata={self.metadata_entry},
        )

    def test_invalid_artifact(self):
        note_content = "[[invalid:127.0.0.1|alias]]"
        refs = ParserTask().run(note_content)
        self.references_assertions(refs)

    def test_invalid_metadata(self):
        note_content = "[[metadata-invalid:127.0.0.1|alias]]"
        refs = ParserTask().run(note_content)
        self.references_assertions(refs)

    def test_no_aliases(self):
        note_content = "[[actor:actor]][[case:case]]"
        refs = ParserTask().run(note_content)
        self.references_assertions(
            refs, actors={self.actor_entry}, cases={self.case_entry}
        )

    def test_both_references_and_text(self):
        note_content = (
            self.actor_pattern
            + "Lorem ipsum dolor sit amet."
            + self.case_pattern
            + self.metadata_pattern
        )
        refs = ParserTask().run(note_content)

        self.references_assertions(
            refs,
            actors={self.actor_entry},
            metadata={self.metadata_entry},
            cases={self.case_entry},
        )

    def test_remove_duplicates(self):
        note_content = (
            self.actor_pattern + self.actor_pattern + "[[actor:actor2|alias]]"
        )
        refs = ParserTask().run(note_content)
        self.references_assertions(
            refs,
            actors={
                self.actor_entry,
                Entry(id=UUID(int=0), type="actor", name="actor2"),
            },
        )
