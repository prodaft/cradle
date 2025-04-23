from rest_framework import serializers

from entries.models import EntryClass
from lsp.utils import Trie


class LspEntryClassSerializer(serializers.ModelSerializer):
    class Meta:
        model = EntryClass
        fields = [
            "type",
            "subtype",
            "description",
            "options",
            "regex",
            "color",
        ]

    def to_representation(self, instance):
        """Move fields from profile to user representation."""
        representation = super().to_representation(instance)
        options = representation.get("options", None)

        if options:
            options = options.strip()
            representation["options"] = len(options) > 0
        else:
            representation["options"] = False

        return representation
