from notes.utils import Link, extract_links
from .utils import NotesTestCase


class ParserTaskTest(NotesTestCase):
    def setUp(self):
        super().setUp()

        self.entity_pattern = "[[case:case|alias]]"
        self.artifact_pattern = "[[ip:127.0.0.1|alias]]"

    def test_no_referenced_entries(self):
        note_content = "Lorem ipsum dolor sit amet."
        refs = list(extract_links(note_content))
        self.assertIs(len(refs), 0)

    def test_referenced_entities(self):
        note_content = self.entity_pattern + self.artifact_pattern
        refs = list(extract_links(note_content))
        self.assertListEqual([Link("case", "case"), Link("ip", "127.0.0.1")], refs)
