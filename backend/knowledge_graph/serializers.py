from rest_framework import serializers
from access.enums import AccessType
from access.models import Access
from entries.enums import EntryType
from entries.models import Entry, Edge
from entries.serializers import EntryListCompressedTreeSerializer


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
