from notes.utils.parser_task import ParserTask
from entities.models import Entity
from .utils import NotesTestCase

from unittest.mock import patch, PropertyMock

from uuid import UUID


class ParserTaskTest(NotesTestCase):
    def setUp(self):
        super().setUp()

        self.actor_pattern = "[[actor:actor|alias]]"
        self.case_pattern = "[[case:case|alias]]"
        self.entry_pattern = "[[ip:127.0.0.1|alias]]"
        self.metadata_pattern = "[[country:Romania|alias]]"

        self.actor_entity = Entity(id=UUID(int=0), name="actor", type="actor")
        self.case_entity = Entity(id=UUID(int=0), name="case", type="case")
        self.entry_entity = Entity(
            id=UUID(int=0), name="127.0.0.1", type="entry", subtype="ip"
        )
        self.metadata_entity = Entity(
            id=UUID(int=0), name="Romania", type="metadata", subtype="country"
        )

    def references_assertions(
        self, refs, actors=set(), cases=set(), entries=set(), metadata=set()
    ):
        self.assertEqual(refs["actor"], actors)
        self.assertEqual(refs["case"], cases)
        self.assertEqual(refs["entry"], entries)
        self.assertEqual(refs["metadata"], metadata)

    def test_no_referenced_entities(self):
        note_content = "Lorem ipsum dolor sit amet."
        refs = ParserTask().run(note_content)
        self.references_assertions(refs)

    @patch("entities.models.Entity.id", new_callable=PropertyMock)
    def test_reference_each_type(self, mock_id):
        mock_id.return_value = UUID(int=0)
        note_content = (
            self.actor_pattern
            + self.case_pattern
            + self.entry_pattern
            + self.metadata_pattern
        )
        refs = ParserTask().run(note_content)
        self.references_assertions(
            refs,
            actors={self.actor_entity},
            cases={self.case_entity},
            entries={self.entry_entity},
            metadata={self.metadata_entity},
        )

    def test_invalid_entry(self):
        note_content = "[[invalid:127.0.0.1|alias]]"
        refs = ParserTask().run(note_content)
        self.references_assertions(refs)

    def test_invalid_metadata(self):
        note_content = "[[metadata-invalid:127.0.0.1|alias]]"
        refs = ParserTask().run(note_content)
        self.references_assertions(refs)

    @patch("entities.models.Entity.id", new_callable=PropertyMock)
    def test_no_aliases(self, mock_id):
        mock_id.return_value = UUID(int=0)
        note_content = "[[actor:actor]][[case:case]]"
        refs = ParserTask().run(note_content)
        self.references_assertions(
            refs, actors={self.actor_entity}, cases={self.case_entity}
        )

    @patch("entities.models.Entity.id", new_callable=PropertyMock)
    def test_both_references_and_text(self, mock_id):
        mock_id.return_value = UUID(int=0)
        note_content = (
            self.actor_pattern
            + "Lorem ipsum dolor sit amet."
            + self.case_pattern
            + self.metadata_pattern
        )
        refs = ParserTask().run(note_content)

        self.references_assertions(
            refs,
            actors={self.actor_entity},
            metadata={self.metadata_entity},
            cases={self.case_entity},
        )

    @patch("entities.models.Entity.id", new_callable=PropertyMock)
    def test_remove_duplicates(self, mock_id):
        mock_id.return_value = UUID(int=0)
        note_content = (
            self.actor_pattern + self.actor_pattern + "[[actor:actor2|alias]]"
        )
        refs = ParserTask().run(note_content)
        self.references_assertions(
            refs, actors={self.actor_entity, Entity(type="actor", name="actor2")}
        )
