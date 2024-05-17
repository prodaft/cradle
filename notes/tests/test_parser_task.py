from django.test import TestCase
from notes.utils.parser_task import ParserTask
from entities.models import Entity


class ParserTaskTest(TestCase):
    def setUp(self):
        self.actor_pattern = "[[actor:actor|alias]]"
        self.case_pattern = "[[case:case|alias]]"
        self.entry_pattern = "[[ip:127.0.0.1|alias]]"
        self.metadata_pattern = "[[country:Romania|alias]]"

        self.actor_entity = Entity(name="actor", type="actor")
        self.case_entity = Entity(name="case", type="case")
        self.entry_entity = Entity(name="127.0.0.1", type="entry", subtype="ip")
        self.metadata_entity = Entity(
            name="Romania", type="metadata", subtype="country"
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

    def test_reference_each_type(self):
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

    def test_no_aliases(self):
        note_content = "[[actor:actor]][[case:case]]"
        refs = ParserTask().run(note_content)
        self.references_assertions(
            refs, actors={self.actor_entity}, cases={self.case_entity}
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
            actors={self.actor_entity},
            metadata={self.metadata_entity},
            cases={self.case_entity},
        )

    def test_remove_duplicates(self):
        note_content = (
            self.actor_pattern + self.actor_pattern + "[[actor:actor2|alias]]"
        )
        refs = ParserTask().run(note_content)
        self.references_assertions(
            refs, actors={self.actor_entity, Entity(type="actor", name="actor2")}
        )
