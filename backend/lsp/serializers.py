from rest_framework import serializers

from entries.models import EntryClass


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
            representation["options"] = options.split("\n")

        return representation
