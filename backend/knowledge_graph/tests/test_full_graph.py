from django.urls import reverse

from entries.constants import SUBTYPE_NOTE
from entries.enums import EntryType
from entries.models import Entry, EntryClass
from notes.models import Note

from .utils import GraphTestCase


class KnowledgeGraphViewTest(GraphTestCase):
    def setUp(self):
        super().setUp()
        self.note_class, _ = EntryClass.objects.get_or_create(
            subtype=SUBTYPE_NOTE, defaults={"type": EntryType.ARTIFACT}
        )
        self.hub_entity = self.entity("c1")

    def add_note_relation(self, title):
        note = Note.objects.create(content="x", title=title, author=self.admin, fleeting=False)
        hub = Entry.objects.create(name=str(note.id), entry_class=self.note_class)
        self.link(self.hub_entity, hub, content_object=note)
        return note

    def get(self):
        return self.get_json(reverse("knowledge_graph"))

    def test_empty_graph_is_bare_subgraph(self):
        data, _ = self.get()
        self.assertEqual(data, {"entries": {}, "relations": [], "colors": {}})

    def test_returns_bare_subgraph_with_note_titles(self):
        note = self.add_note_relation("My note")

        data, _ = self.get()

        self.assertEqual(set(data), {"entries", "relations", "colors"})
        self.assertEqual(len(data["relations"]), 1)
        self.assertIn("My note", str(data["entries"]))
        self.assertIn(str(note.id), str(data["entries"]))

    def test_query_count_does_not_grow_with_relations(self):
        self.add_note_relation("n1")
        _, few = self.get()
        for i in range(5):
            self.add_note_relation(f"n{i + 2}")
        _, many = self.get()
        self.assertEqual(few, many)
