from ..utils import CradleLinkRef, extract_links
from .utils import NotesTestCase


class ParserTaskTest(NotesTestCase):
    def test_no_referenced_entries(self):
        refs = list(extract_links("Lorem ipsum dolor sit amet."))
        self.assertEqual(len(refs), 0)

    def test_extracts_links(self):
        refs = list(extract_links("[[case:case|alias]][[ip:127.0.0.1|alias]]"))
        self.assertListEqual([CradleLinkRef("case", "case"), CradleLinkRef("ip", "127.0.0.1")], refs)
