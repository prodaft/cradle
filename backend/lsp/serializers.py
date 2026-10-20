"""Serializers for LSP API responses."""

from entries.serializers import EntryClassSerializerNoChildren


class LspEntryClassSerializer(EntryClassSerializerNoChildren):
    """EntryClass subset for LSP endpoints (types, completion trie). Excludes generative_regex, options, prefix."""

    class Meta(EntryClassSerializerNoChildren.Meta):
        fields = ["type", "subtype", "description", "format", "regex", "color"]
