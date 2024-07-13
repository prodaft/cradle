from notes.utils.parser_task import ParserTask
from entries.models import Entry
from .utils import NotesTestEntity

from uuid import UUID


class ParserTaskTest(NotesTestEntity):
    def setUp(self):
        super().setUp()

        self.entity_pattern = "[[case:case|alias]]"
        self.artifact_pattern = "[[ip:127.0.0.1|alias]]"

        self.entity_entry = Entry(id=UUID(int=0), name="entity", type="entity")
        self.artifact_entry = Entry(
            id=UUID(int=0), name="127.0.0.1", type="artifact", subtype="ip"
        )
        self.metadata_entry = Entry(
            id=UUID(int=0), name="Romania", type="metadata", subtype="country"
        )

    def references_assertions(
        self, refs, entities=set(), artifacts=set()
    ):
        self.assertEqual(refs["entity"], entities)
        self.assertEqual(refs["artifact"], artifacts)

    def test_no_referenced_entries(self):
        note_content = "Lorem ipsum dolor sit amet."
        refs = ParserTask().run(note_content)
        self.references_assertions(refs)

    def test_reference_each_type(self):
        note_content = (
            self.entity_pattern
            + self.artifact_pattern
        )
        refs = ParserTask().run(note_content)
        self.references_assertions(
            refs,
            entities={self.entity_entry},
            artifacts={self.artifact_entry},
        )

    def test_invalid_artifact(self):
        note_content = "[[invalid:127.0.0.1|alias]]"
        refs = ParserTask().run(note_content)
        self.references_assertions(refs)

    def test_no_aliases(self):
        note_content = "[[case:case]]"
        refs = ParserTask().run(note_content)
        self.references_assertions(
            refs, entities={self.entity_entry}
        )

    def test_both_references_and_text(self):
        note_content = (
            "Lorem ipsum dolor sit amet."
            + self.entity_pattern
        )
        refs = ParserTask().run(note_content)

        self.references_assertions(
            refs,
            entities={self.entity_entry},
        )

    def test_remove_duplicates(self):
        note_content = (
            self.entity_pattern + self.entity_pattern
        )
        refs = ParserTask().run(note_content)
        self.references_assertions(
            refs,
        )
