"""Serializers for knowledge graph API responses."""

import uuid
from collections import Counter
from collections.abc import Iterable
from datetime import datetime

from django.db.models import Max, Min, Q, QuerySet
from rest_framework import serializers

from entries.constants import SUBTYPE_NOTE
from entries.models import Edge, Entry, Relation
from entries.serializers import EntryListCompressedTreeSerializer, EntrySerializer
from notes.models import Note

EdgeRow = tuple[int | str, int, int, datetime, datetime]


class EdgeRelationSerializer(serializers.ModelSerializer):
    """Edge between two entries for graph visualization."""

    last_seen_at = serializers.DateTimeField(help_text="When the newest relation between the two entries was created")

    class Meta:
        model = Edge
        fields = ["id", "src", "dst", "created_at", "last_seen_at"]
        extra_kwargs = {
            "id": {"help_text": "Edge ID"},
            "src": {"help_text": "Source entry ID"},
            "dst": {"help_text": "Destination entry ID"},
            "created_at": {"help_text": "When the relation was first observed"},
        }


class GraphInaccessibleResponseSerializer(serializers.Serializer):
    """Serializer for graph inaccessible response."""

    inaccessible_ids = serializers.ListField(
        child=serializers.IntegerField(),
        help_text="List of inaccessible entry IDs",
    )

    class Meta:
        ref_name = "GraphInaccessibleResponse"


class SubGraphSerializer(serializers.Serializer):
    """Graph data with entries, relations, and colors keyed by subtype."""

    entries = EntryListCompressedTreeSerializer(
        fields=("name", "id", "location", "degree", "note_id"),
        help_text="Compressed tree of entries in the subgraph",
    )
    relations = EdgeRelationSerializer(many=True, help_text="Edges between entries")
    colors = serializers.DictField(help_text="Colors keyed by entry subtype")

    @classmethod
    def build(cls, edges: Iterable[EdgeRow], entries: Iterable[Entry]) -> dict:
        """Response data for ``edges`` (one row per pair) between ``entries`` (entry classes selected up front).

        Drops edges with an endpoint missing from ``entries`` (such as an entry deleted since the edges view was
        refreshed) and entries left without edges, counts degree as distinct neighbours, and labels note hub entries
        with their note's title. Edges are written directly rather than through ``EdgeRelationSerializer``, which is
        too slow for whole-graph responses.
        """
        entries = {int(entry.id): entry for entry in entries}
        edges = [edge for edge in edges if edge[1] in entries and edge[2] in entries]
        endpoints = {edge[1] for edge in edges} | {edge[2] for edge in edges}
        entries = {entry_id: entry for entry_id, entry in entries.items() if entry_id in endpoints}

        degree_map: Counter[int] = Counter()
        for pair in {frozenset((edge[1], edge[2])) for edge in edges if edge[1] != edge[2]}:
            degree_map.update(pair)

        for entry in entries.values():
            entry.degree = degree_map.get(int(entry.id), 0)
            entry.note_id = None
            if entry.entry_class.subtype == SUBTYPE_NOTE and entry.name and len(entry.name) >= 36:
                try:
                    entry.note_id = str(uuid.UUID(entry.name[:36]))
                except ValueError:
                    pass

        note_ids = {entry.note_id for entry in entries.values() if entry.note_id}
        titles = {
            str(note.id): (note.metadata or {}).get("title") or note.title
            for note in Note.objects.filter(id__in=note_ids).only("id", "title", "metadata")
        }
        for entry in entries.values():
            if entry.note_id:
                entry.name = titles.get(entry.note_id) or entry.note_id

        colors = {
            e.entry_class.subtype: e.entry_class.color for e in entries.values() if e.entry_class.subtype is not None
        }
        to_datetime = serializers.DateTimeField().to_representation

        return {
            "entries": cls().fields["entries"].to_representation(entries.values()),
            "relations": [
                {
                    "id": str(edge_id),
                    "src": src,
                    "dst": dst,
                    "created_at": to_datetime(created_at),
                    "last_seen_at": to_datetime(last_seen_at),
                }
                for edge_id, src, dst, created_at, last_seen_at in edges
            ],
            "colors": colors,
        }

    @classmethod
    def from_relations(cls, relations: QuerySet[Relation]) -> dict:
        """Response data for ``relations`` (already access-filtered), merged into one edge per pair in the database."""
        rows = list(
            relations.values_list("e1_id", "e2_id").annotate(first_seen=Min("created_at"), newest=Max("created_at"))
        )
        if not rows:
            return {"entries": {}, "relations": [], "colors": {}}

        edges = [((src << 32) | dst, src, dst, first_seen, newest) for src, dst, first_seen, newest in rows]
        entries = Entry.objects.filter(Q(id__in=relations.values("e1")) | Q(id__in=relations.values("e2")))
        return cls.build(edges, entries.select_related("entry_class"))


class EntryWithDepthSerializer(EntrySerializer):
    """Entry with graph traversal depth. Output is flattened (type, subtype, color at top level)."""

    depth = serializers.IntegerField(read_only=True, help_text="Hops from source in graph traversal")

    class Meta:
        model = Entry
        fields = ["id", "name", "entry_class", "depth"]
