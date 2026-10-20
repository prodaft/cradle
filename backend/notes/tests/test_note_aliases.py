"""connect_aliases rebuilds a note's alias relations instead of appending to them."""

from unittest.mock import patch

from entries.enums import RelationReason
from entries.models import Entry

from ..models import Note
from ..tasks import connect_aliases
from .utils import NotesTestCase


@patch("entries.tasks.refresh_edges_materialized_view.apply_async")
class ConnectAliasesTest(NotesTestCase):
    def setUp(self):
        super().setUp()
        Entry.objects.create(name="c1", entry_class=self.entryclass1)
        self.note = Note.objects.create(author=self.user, content="[[case:c1|harbor]]")

    def alias_relations(self):
        return self.note.relations.filter(reason=RelationReason.ALIAS)

    def test_repeated_runs_do_not_duplicate(self, _refresh):
        connect_aliases(self.note.id)
        connect_aliases(self.note.id)

        self.assertEqual(self.alias_relations().count(), 1)

    def test_removed_alias_link_is_disconnected(self, _refresh):
        connect_aliases(self.note.id)
        Note.objects.filter(pk=self.note.pk).update(content="[[case:c1]]")

        connect_aliases(self.note.id)

        self.assertFalse(self.alias_relations().exists())
