from rest_framework import serializers

from entries.models import EntryClass


class LspEntryClassSerializer(serializers.ModelSerializer):
    class Meta:
        model = EntryClass
        fields = [
            "type",
            "subtype",
            "description",
            "format",
            "regex",
            "color",
        ]
