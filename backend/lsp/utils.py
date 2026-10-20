"""LSP utilities: trie for autocomplete and completion data builders."""

from collections.abc import Iterable
from typing import Any

from entries.enums import EntryType
from entries.models import Entry, EntryClass
from user.models import CradleUser


class TrieNode:
    """Node in a trie for prefix-based completion lookups."""

    def __init__(self):
        self.children = {}
        self.eow = False


class Trie:
    """Trie for LSP autocomplete. Custom implementation; serializes to compact {"eow", "c"} format for the UI client."""

    def __init__(self):
        self.root = TrieNode()

    def insert(self, word: str) -> None:
        """Insert a word into the trie."""
        current_node = self.root
        for char in word:
            if char not in current_node.children:
                current_node.children[char] = TrieNode()
            current_node = current_node.children[char]
        current_node.eow = True

    def serialize(self) -> dict[str, Any]:
        """Serialize the trie to compact {"eow", "c"} dict for the UI client."""

        def _serialize_node(node):
            serialized = {"eow": node.eow, "c": {}}
            for char, child_node in node.children.items():
                serialized["c"][char] = _serialize_node(child_node)
            return serialized

        return _serialize_node(self.root)


def get_lsp_pack(user: CradleUser, classes: Iterable[EntryClass], initial: str = "") -> dict[str, dict[str, Any]]:
    """Build a map of subtype -> serialized trie for LSP completion from the given entry classes."""
    tries: dict[str, dict[str, Any]] = {}

    for eclass in classes:
        trie = Trie()
        # Artifact types with fixed options complete from those; everything else from the entries the user may read.
        uses_options = eclass.type != EntryType.ENTITY and bool(eclass.options)
        if uses_options:
            names = (opt.strip() for opt in eclass.options.split("\n"))
        else:
            names = (
                Entry.objects.readable(user)
                .filter(entry_class=eclass, name__istartswith=initial)
                .values_list("name", flat=True)
            )
        for name in names:
            if name:
                trie.insert(name)
        if uses_options or trie.root.children:
            tries[eclass.subtype] = trie.serialize()

    return tries
