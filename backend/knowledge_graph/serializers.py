from rest_framework import serializers
from access.enums import AccessType
from access.models import Access
from entries.enums import EntryType
from entries.models import Entry, Edge, Relation
from core.utils import flatten
from entries.serializers import (
    EntryListCompressedTreeSerializer,
    EntryClassSerializerNoChildren,
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
        entries = flatten([(r.e1, r.e2) for r in relations])

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


class EntryWithDepthSerializer(EntrySerializer):
    entry_class = EntryClassSerializerNoChildren(read_only=True)
    depth = serializers.IntegerField(read_only=True)

    class Meta:
        model = Entry
        fields = ["id", "name", "entry_class", "depth"]
