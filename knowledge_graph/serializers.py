from rest_framework import serializers
from typing import Any
from entries.serializers import EntryListCompressedTreeSerializer


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


class KnowledgeGraphSerializer(serializers.Serializer):
    entries = EntryListCompressedTreeSerializer(fields=("name", "id"))
    links = LinksSerializerAdjacencyList()
    colors = EntryClassColorSerializer(many=True)

    def to_representation(self, instance) -> dict[str, Any]:
        data = super().to_representation(instance)

        colorlist = data["colors"]
        data["colors"] = {x["subtype"]: x["color"] for x in colorlist}

        return data
