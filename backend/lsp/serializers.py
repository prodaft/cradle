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
            "regex",
            "options",
            "color",
        ]

    def to_representation(self, instance):
        """Move fields from profile to user representation."""
        representation = super().to_representation(instance)
        options = representation.get("options", None)

        if options:
            options = options.split("\n")
            representation["options"] = options

            if len(options) > 0:
                trie = Trie()
                for o in options:
                    trie.insert(o)

                representation["options"] = trie.serialize()
            else:
                representation["options"] = None

        return representation
