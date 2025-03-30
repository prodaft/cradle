from django.db import connection
from rest_framework import serializers
from typing import Any
from access.enums import AccessType
from access.models import Access
from entries.enums import EntryType
from entries.models import Entry, Edge
from entries.serializers import EntryListCompressedTreeSerializer
from query.utils import parse_query


class PathfindQuery(serializers.Serializer):
    src = serializers.PrimaryKeyRelatedField(
        queryset=Entry.objects.all(), required=True
    )
    dsts = serializers.PrimaryKeyRelatedField(
        queryset=Entry.objects.all(), required=True, many=True
    )
    max_depth = serializers.IntegerField(required=True, max_value=3)
    min_date = serializers.DateTimeField(required=True)
    max_date = serializers.DateTimeField(required=True)

    class Meta:
        fields = ["src", "dsts", "max_depth", "min_date", "max_date"]

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

    def get_result(self):
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT path
                FROM find_all_paths(
                    %s::UUID,              -- src
                    %s::BIT(2048),         -- access_vector
                    %s::INT,               -- max_depth
                    %s::UUID[],            -- dsts
                    %s::TIMESTAMP,         -- min_date
                    %s::TIMESTAMP          -- max_date
                ) rp
                """,
                [
                    self.validated_data["src"].id,
                    self.user.access_vector,
                    self.validated_data["max_depth"] + 1,
                    [x.id for x in self.validated_data["dsts"]],
                    self.validated_data["min_date"],
                    self.validated_data["max_date"],
                ],
            )

            paths = []
            entry_ids = set()

            for path in cursor.fetchall():
                paths.append(path[0])
                entry_ids.update(path[0])

            entries = Entry.objects.filter(id__in=entry_ids)

            return paths, entries


class RelationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Edge
        fields = ["id", "src", "dst", "created_at", "last_seen"]


class SubGraphSerializer(serializers.Serializer):
    entries = EntryListCompressedTreeSerializer(
        fields=("name", "id", "location", "degree")
    )
    relations = RelationSerializer(many=True)
    colors = serializers.DictField()

    class Meta:
        fields = ["entries", "paths", "colors"]
