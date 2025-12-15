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


class PathfindQuery(serializers.Serializer):
    src = serializers.PrimaryKeyRelatedField(
        queryset=Entry.objects.all(), required=True
    )
    dsts = serializers.PrimaryKeyRelatedField(
        queryset=Entry.objects.all(), required=True, many=True
    )
    min_date = serializers.DateTimeField(required=True)
    max_date = serializers.DateTimeField(required=True)

    class Meta:
        fields = ["src", "dsts", "min_date", "max_date"]

    def __init__(self, *args, user=None, **kwargs):
        self.user = user
        super().__init__(*args, **kwargs)

    def validate(self, data):
        if (
            data["src"].entry_class.type == EntryType.ENTITY
            and not Access.objects.has_access_to_entities(
                self.user, {data["src"]}, {AccessType.READ, AccessType.READ_WRITE}
            )
        ):
            raise serializers.ValidationError("The source entity is not accessible.")

        if not Access.objects.has_access_to_entities(
            self.user,
            set([x for x in data["dsts"] if x.entry_class.type == EntryType.ENTITY]),
            {AccessType.READ, AccessType.READ_WRITE},
        ):
            raise serializers.ValidationError(
                "One or more of the requested entity is not accessible."
            )

        return super().validate(data)


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
        fields=("name", "id", "location", "degree")
    )
    relations = EdgeRelationSerializer(many=True)
    colors = serializers.DictField()

    class Meta:
        fields = ["entries", "paths", "colors"]

    @classmethod
    def from_relations(cls, relations: list[Relation]) -> "SubGraphSerializer":
        """
        Create a SubGraphSerializer instance from a Relation queryset.
        """
        entries = set(flatten([(r.e1, r.e2) for r in relations]))

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
                        src=r.e1.id,
                        dst=r.e2.id,
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
