"""Serializers for knowledge graph API responses."""

import uuid
from collections import Counter

from drf_spectacular.extensions import OpenApiSerializerExtension
from rest_framework import serializers

from core.utils import flatten
from entries.models import Edge, Entry, Relation
from entries.serializers import (
    EntryClassSerializerNoChildren,
    EntryListCompressedTreeSerializer,
    EntrySerializer,
)
from notes.models import Note


class EdgeRelationSerializer(serializers.ModelSerializer):
    """Edge between two entries for graph visualization."""

    class Meta:
        model = Edge
        fields = ["id", "src", "dst", "created_at", "last_seen"]
        extra_kwargs = {
            "id": {"help_text": "Edge ID"},
            "src": {"help_text": "Source entry ID"},
            "dst": {"help_text": "Destination entry ID"},
            "created_at": {"help_text": "When the relation was first observed"},
            "last_seen": {"help_text": "When the relation was last observed"},
        }


class GraphInaccessibleResponseSerializer(serializers.Serializer):
    """Serializer for graph inaccessible response."""

    inaccessible = serializers.ListField(
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
    def from_relations(cls, relations: list[Relation]) -> "SubGraphSerializer":
        """Create a SubGraphSerializer instance from a Relation queryset.

        Ensures consistent ID types (integers) for src and dst. Calculates node degrees.
        """
        entries = set(flatten([(r.e1, r.e2) for r in relations]))

        degree_map: Counter[int] = Counter()
        for r in relations:
            degree_map[int(r.e1.id)] += 1
            degree_map[int(r.e2.id)] += 1

        # Annotate entries with their calculated degree and enrich note entries with note titles and UUIDs
        for entry in entries:
            entry.degree = degree_map.get(int(entry.id), 0)

            # For note entries, replace the name with the note title and add note_id
            if entry.entry_class.subtype == "note" and entry.name and len(entry.name) >= 36:
                try:
                    note_uuid = str(uuid.UUID(entry.name[:36]))
                    entry.note_id = note_uuid
                    try:
                        note = Note.objects.get(id=note_uuid)
                        entry.name = (note.metadata or {}).get("title") or note.title or note_uuid
                    except Note.DoesNotExist:
                        entry.name = note_uuid
                        entry.note_id = note_uuid
                except ValueError:
                    entry.note_id = None
            else:
                entry.note_id = None

        colors = {e.entry_class.subtype: e.entry_class.color for e in entries if e.entry_class.subtype is not None}

        serializer = cls(
            {
                "entries": entries,
                "relations": [
                    Edge(
                        id=r.id,
                        # Ensure src and dst are integers for consistent frontend handling
                        src=int(r.e1.id),
                        dst=int(r.e2.id),
                        created_at=r.created_at,
                        last_seen=r.last_seen,
                    )
                    for r in relations
                ],
                "colors": colors,
            }
        )

        return serializer


class EntryWithDepthSerializerExtension(OpenApiSerializerExtension):
    target_class = "knowledge_graph.serializers.EntryWithDepthSerializer"
    match_subclasses = True

    def map_serializer(self, auto_schema, direction):
        schema = super().map_serializer(auto_schema, direction)
        properties = schema.get("properties", {})
        properties.pop("entry_class", None)

        properties["depth"] = {
            "type": "integer",
            "description": "Depth of the entry in the graph traversal",
            "readOnly": True,
        }
        properties["type"] = {
            "type": "string",
            "description": "Type of the entry (e.g., entity, artifact)",
        }
        properties["subtype"] = {
            "type": "string",
            "description": "Subtype for the entry",
        }
        properties["description"] = {
            "type": "string",
            "description": "Description of the entry",
            "nullable": True,
        }
        properties["color"] = {
            "type": "string",
            "description": "Color associated with the entry class",
            "nullable": True,
        }

        required = set(schema.get("required", []))

        required.add("subtype")
        required.add("type")
        schema["required"] = list(required)
        return schema


class EntryWithDepthSerializer(EntrySerializer):
    """Entry with graph traversal depth. Output is flattened (type, subtype, color at top level)."""

    entry_class = EntryClassSerializerNoChildren(read_only=True)
    depth = serializers.IntegerField(read_only=True, help_text="Hops from source in graph traversal")

    class Meta:
        model = Entry
        fields = ["id", "name", "entry_class", "depth"]
