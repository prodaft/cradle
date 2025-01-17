from django.db import connection
from rest_framework import serializers
from typing import Any
from access.enums import AccessType
from access.models import Access
from entries.enums import EntryType
from entries.models import Entry, EntryClass
from entries.serializers import EntryListCompressedTreeSerializer


class EntryRequestSerializer(serializers.Serializer):
    subtype = serializers.CharField(required=True)
    name = serializers.CharField(required=True)

    def resolve(self, attrs: Any) -> Any:
        if not Entry.objects.filter(
            entry_class_id=attrs["subtype"], name=attrs["name"]
        ).exists():
            raise serializers.ValidationError("Entry does not exist")

        entry = Entry.objects.get(entry_class_id=attrs["subtype"], name=attrs["name"])

        if (
            entry.entry_class.type == EntryType.ENTITY
            and not Access.objects.has_access_to_entities(
                self.context["request"].user,
                [entry],
                [AccessType.READ, AccessType.READ_WRITE],
            )
        ):
            raise serializers.ValidationError("Entry does not exist")

        return entry

    def to_internal_value(self, data):
        validated_data = super().to_internal_value(data)
        entry = self.resolve(validated_data)

        return entry


class BaseGraphQuery(serializers.Serializer):
    def validate(self, attrs: Any) -> Any:
        if attrs["min_depth"] > attrs["max_depth"]:
            raise serializers.ValidationError(
                "The minimum depth must be less than or equal to the maximum"
            )

        self.entity_types = set(
            Entry.objects.filter(entry_class__type=EntryType.ENTITY).values_list(
                "entry_class_id", flat=True
            )
        )

        return super().validate(attrs)

    def get_edges(self):
        raise NotImplementedError()

    def get_vertices(self):
        raise NotImplementedError()

    def filter_vertices_by_access(self, result):
        filter = [None] * len(result)
        c = 0

        for i in range(len(result)):
            if not result[i][0]:
                if result[i][2] in self.entity_types:
                    filter[c] = (False, result[i][1])
                    c += 1

            else:
                filter[c] = result[i]
                c += 1

        return filter[:c]


class TraverseEntryTypesQuery(BaseGraphQuery):
    src = EntryRequestSerializer(required=True)
    min_depth = serializers.IntegerField(min_value=1, default=1)
    max_depth = serializers.IntegerField(required=True, max_value=3)

    class Meta:
        fields = ["min_depth", "max_depth"]

    def get_edges(self):
        raise NotImplementedError()

    def get_vertices(self):
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT MIN(CASE WHEN can_access THEN 1 ELSE 0 END) = 1, entry_class_id FROM
                    get_minimum_distances_for_user(
                        %s, %s, %s
                    ) JOIN entries_entry e ON e.id = dst_entry WHERE distance >= %s
                    GROUP BY entry_class_id;
                """,
                [
                    str(self.validated_data["src"].id),
                    str(self.context["request"].user.id),
                    self.validated_data["max_depth"],
                    self.validated_data["min_depth"],
                ],
            )

            accesses = {x[1]: x[0] for x in cursor.fetchall()}

            subtypes = EntryClass.objects.filter(subtype__in=accesses.keys())

            result = {}

            for i in subtypes:
                if i.type not in result:
                    result[i.type] = {}

                result[i.type][i.subtype] = (
                    accesses[i.subtype] or i.type == EntryType.ARTIFACT
                )

            return result


class InaccesibleQuery(BaseGraphQuery):
    src = EntryRequestSerializer(required=True)
    min_depth = serializers.IntegerField(min_value=1, default=1)
    max_depth = serializers.IntegerField(required=True, max_value=3)

    class Meta:
        fields = ["min_depth", "max_depth"]

    def get_edges(self):
        raise NotImplementedError()

    def get_vertices(self):
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT can_access, id, entry_class_id, name, distance FROM
                    get_minimum_distances_for_user(
                        %s, %s, %s
                    ) JOIN entries_entry e ON e.id = dst_entry WHERE distance >= %s AND can_access = false;
                """,
                [
                    str(self.validated_data["src"].id),
                    str(self.context["request"].user.id),
                    self.validated_data["max_depth"],
                    self.validated_data["min_depth"],
                ],
            )

            result = list(cursor.fetchall())
            return KnowledgeGraphSerializer(
                entries_key=(None, "id", "subtype", "name", None),
                entries=self.filter_vertices_by_access(result),
            ).data


class BFSQuery(BaseGraphQuery):
    src = EntryRequestSerializer(required=True)
    min_depth = serializers.IntegerField(min_value=1, default=1)
    max_depth = serializers.IntegerField(required=True, max_value=3)
    subtype = serializers.CharField(required=False)
    name = serializers.CharField(required=False)

    class Meta:
        fields = ["src", "min_depth", "max_depth", "subtype", "name"]

    def get_edges(self):
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT path FROM
                    get_related_entry_paths_for_user(
                        %s, %s, %s
                    ) WHERE depth >= %s;
                """,
                [
                    str(self.validated_data["src"].id),
                    str(self.context["request"].user.id),
                    self.validated_data["max_depth"],
                    self.validated_data["min_depth"],
                ],
            )

            result = list(map(lambda x: x[0], cursor.fetchall()))
            return KnowledgeGraphSerializer(paths=result).data

    def get_vertices(self):
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT can_access, id, entry_class_id, name, distance FROM
                    get_minimum_distances_for_user(
                        %s, %s, %s
                    ) JOIN entries_entry e ON e.id = dst_entry WHERE distance >= %s AND name LIKE %s AND entry_class_id LIKE %s;
                """,
                [
                    str(self.validated_data["src"].id),
                    str(self.context["request"].user.id),
                    self.validated_data["max_depth"],
                    self.validated_data["min_depth"],
                    "%" + self.validated_data.get("name", "") + "%",
                    self.validated_data.get("subtype", "%"),
                ],
            )

            result = list(cursor.fetchall())
            return KnowledgeGraphSerializer(
                entries_key=(None, "id", "subtype", "name", None),
                entries=self.filter_vertices_by_access(result),
            ).data


class PathfindQuery(BaseGraphQuery):
    src = EntryRequestSerializer(required=True)
    dst = EntryRequestSerializer(required=True)
    min_depth = serializers.IntegerField(required=True, min_value=0)
    max_depth = serializers.IntegerField(required=True, max_value=3)

    class Meta:
        fields = ["src", "min_depth", "max_depth"]

    def get_edges(self):
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT can_access, path
                    FROM get_paths_of_length_n_between_two_entries(
                        %s, %s, %s, %s
                    ) rp
                    WHERE depth >= %s AND can_access;
                """,
                [
                    str(self.context["request"].user.id),
                    str(self.validated_data["src"].id),
                    str(self.validated_data["dst"].id),
                    self.validated_data["max_depth"],
                    self.validated_data["min_depth"],
                ],
            )

            result = list(map(lambda x: x[0], cursor.fetchall()))
            return KnowledgeGraphSerializer(paths=result).data

    def get_vertices(self):
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT DISTINCT MAX(CASE WHEN can_access THEN 1 ELSE 0 END) = 1, e.id, entry_class_id, name
                    FROM get_paths_of_length_n_between_two_entries(
                        %s, %s, %s, %s
                    ) rp
                    JOIN LATERAL UNNEST(rp.path) AS path_entry_id ON TRUE
                    JOIN entries_entry e ON e.id = path_entry_id
                    WHERE depth >= %s AND can_access
                    GROUP BY e.id;
                """,
                [
                    str(self.context["request"].user.id),
                    str(self.validated_data["src"].id),
                    str(self.validated_data["dst"].id),
                    self.validated_data["max_depth"],
                    self.validated_data["min_depth"],
                ],
            )

            result = list(cursor.fetchall())
            return KnowledgeGraphSerializer(
                entries_key=(None, "id", "subtype", "name"),
                entries=self.filter_vertices_by_access(result),
            ).data


class GraphQueryRequestSerializer(serializers.Serializer):
    mappings = {
        "entry_types": TraverseEntryTypesQuery,
        "bfs": BFSQuery,
        "pathfind": PathfindQuery,
        "inaccessible": InaccesibleQuery,
    }

    operation = serializers.ChoiceField(choices=list(mappings.keys()), required=True)
    result_type = serializers.ChoiceField(choices=["vertices", "paths"], required=True)
    params = serializers.DictField(required=True)

    class Meta:
        fields = ["operation", "params", "result_type"]

    def validate(self, attrs: Any) -> Any:
        if attrs["operation"] not in self.mappings:
            raise serializers.ValidationError("Invalid operation")

        serializer = self.mappings[attrs["operation"]](
            data=attrs["params"], context=self.context
        )

        if not serializer.is_valid():
            raise serializers.ValidationError(serializer.errors)

        self.filter = serializer
        self.result_type = attrs["result_type"]

        return super().validate(attrs)

    def get_result(self):
        if self.result_type == "vertices":
            return self.filter.get_vertices()
        else:
            return self.filter.get_edges()


class LinksSerializerAdjacencyList(serializers.BaseSerializer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

    def to_representation(self, data):
        adjacency_list = {}

        for src, dst in data:
            src, dst = str(src), str(dst)

            if src not in adjacency_list:
                adjacency_list[src] = []

            adjacency_list[src].append(dst)

        return adjacency_list


class EntryClassColorSerializer(serializers.Serializer):
    subtype = serializers.CharField()
    color = serializers.CharField()

    class Meta:
        fields = ["subtype", "color"]


class GraphQueryResponseSerializer(serializers.Serializer):
    entries = EntryListCompressedTreeSerializer(fields=("name", "id"))
    paths = serializers.ListField()

    colors = serializers.DictField()

    def to_representation(self, instance) -> dict[str, Any]:
        data = super().to_representation(instance)
        colorlist = data["colors"]
        data["colors"] = {x["subtype"]: x["color"] for x in colorlist}
        return data


class KnowledgeGraphSerializer:
    def __init__(self, entries_key=[], entries=[], paths=[]):
        self.entries = entries
        self.paths = paths
        self.entries_key = entries_key

    def group_entries(self, entries):
        if len(self.entries_key) == 0:
            return {}

        grouped = {}
        subtype_idx = self.entries_key.index("subtype")

        for entry in entries:
            subtype = entry[subtype_idx] if entry[0] else "unknown"

            if subtype not in grouped:
                grouped[subtype] = []

            grouped[subtype].append(
                {
                    self.entries_key[i]: entry[i]
                    for i in range(len(entry))
                    if i != subtype_idx and self.entries_key[i] is not None
                }
            )

        return grouped

    @property
    def data(self):
        entries = self.group_entries(self.entries)
        colors = (
            dict(EntryClass.objects.values_list("subtype", "color"))
            if len(entries) > 0
            else {}
        )

        return {"entries": entries, "paths": self.paths, "colors": colors}
