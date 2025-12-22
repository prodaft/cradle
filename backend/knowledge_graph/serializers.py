import re

from drf_spectacular.extensions import OpenApiSerializerExtension
from rest_framework import serializers

from access.enums import AccessType
from access.models import Access
from core.utils import flatten
from entries.enums import EntryType
from entries.models import Edge, Entry, Relation
from entries.serializers import (
    EntryClassSerializerNoChildren,
    EntryListCompressedTreeSerializer,
    EntrySerializer,
)
from notes.models import Note


class EdgeRelationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Edge
        fields = ["id", "src", "dst", "created_at", "last_seen"]


class GraphInaccessibleResponseSerializer(serializers.Serializer):
    """Serializer for graph inaccessible response."""

    inaccessible = serializers.ListField(
        child=serializers.CharField(),
        help_text="List of inaccessible entry IDs",
    )

    class Meta:
        ref_name = "GraphInaccessibleResponse"


class SubGraphSerializer(serializers.Serializer):
    entries = EntryListCompressedTreeSerializer(
        fields=("name", "id", "location", "degree", "note_id")
    )
    relations = EdgeRelationSerializer(many=True)
    colors = serializers.DictField()

    class Meta:
        fields = ["entries", "paths", "colors"]

    @classmethod
    def from_relations(cls, relations: list[Relation]) -> "SubGraphSerializer":
        """
        Create a SubGraphSerializer instance from a Relation queryset.
        Ensures consistent ID types (integers) for src and dst in edges.
        Calculates node degrees based on actual connections.
        """
        entries = set(flatten([(r.e1, r.e2) for r in relations]))

        # Calculate degree for each entry based on relations
        degree_map = {}
        for r in relations:
            e1_id = int(r.e1.id)
            e2_id = int(r.e2.id)
            degree_map[e1_id] = degree_map.get(e1_id, 0) + 1
            degree_map[e2_id] = degree_map.get(e2_id, 0) + 1

        # Annotate entries with their calculated degree and enrich note entries with note titles and UUIDs
        for entry in entries:
            entry.degree = degree_map.get(int(entry.id), 0)
            
            # For note entries, replace the name with the note title and add note_id
            if entry.entry_class.subtype == "note" and entry.name:
                # Extract UUID from note entry name (format: "uuid-hash")
                uuid_match = re.match(r'^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})', entry.name, re.IGNORECASE)
                if uuid_match:
                    note_uuid = uuid_match.group(1)
                    entry.note_id = note_uuid  # Add note UUID to entry
                    try:
                        note = Note.objects.get(id=note_uuid)
                        # Use metadata title if available, otherwise fall back to title field
                        note_title = (note.metadata or {}).get('title') or note.title or note_uuid
                        entry.name = note_title
                    except Note.DoesNotExist:
                        # If note not found, keep the UUID
                        entry.name = note_uuid
                        entry.note_id = note_uuid
                else:
                    entry.note_id = None
            else:
                entry.note_id = None

        colors = {
            e.entry_class.subtype: e.entry_class.color
            for e in entries
            if e.entry_class.subtype is not None
        }

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
    entry_class = EntryClassSerializerNoChildren(read_only=True)
    depth = serializers.IntegerField(read_only=True)

    class Meta:
        model = Entry
        fields = ["id", "name", "entry_class", "depth"]


class EntryWithDepthSerializerView(serializers.Serializer):
    depth = serializers.IntegerField(read_only=True)
    id = serializers.IntegerField(read_only=True)
    name = serializers.CharField(read_only=True)
    subtype = serializers.CharField(read_only=True)
    type = serializers.CharField(read_only=True)
    description = serializers.CharField(read_only=True, allow_blank=True)
    color = serializers.CharField(read_only=True, allow_blank=True)

    class Meta:
        fields = ["id", "name", "depth", "subtype", "type", "description", "color"]
