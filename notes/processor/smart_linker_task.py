import itertools
from entries.enums import EntryType

from .base_task import BaseTask
from ..models import Note, Relation

from .. import parser


class SmartLinkerTask(BaseTask):
    def run(self, note: Note) -> Note:
        """
        Create the links between the entries, using the note

        Args:
            note: The note object being processde

        Returns:
            The processed note object.
        """

        flattree = parser.cradle_connections(note.content)
        tree = parser.heading_hierarchy(flattree)

        pairs = tree.relation_pairs()

        pairs_resolved = set()

        entries = {}
        for e in note.entries.all():
            entries[parser.Link(e.entry_class.subtype, e.name)] = e

        entities = {
            x for x in entries.values() if x.entry_class.type == EntryType.ENTITY
        }
        artifacts = {
            x for x in entries.values() if x.entry_class.type == EntryType.ARTIFACT
        }

        for src, dst in pairs:
            pairs_resolved.add((entries[src], entries[dst]))

        for e, a in itertools.product(entities, artifacts):
            pairs_resolved.add((e, a))
            pairs_resolved.add((a, e))

        rels = []
        for src, dst in pairs_resolved:
            rels.append(Relation(src_entry=src, dst_entry=dst, note=note))

        Relation.objects.bulk_create(rels)
