"""LSP utilities: trie for autocomplete and completion data builders."""

from collections.abc import Iterable
from typing import Any

from django.db.models import QuerySet

from access.models import Access
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


def get_lsp_entries(user: CradleUser, eclass: EntryClass, initial: str) -> QuerySet[Entry]:
    """Return entries accessible to the user for the given class, filtered by name prefix."""
    return Entry.objects.accessible(user).filter(entry_class=eclass, name__istartswith=initial).distinct()


def get_entities(user: CradleUser) -> QuerySet[Entry]:
    """Return entities accessible to the user (all if admin, else by access)."""
    if user.is_cradle_admin:
        return Entry.entities.all().distinct()
    entity_ids = Access.objects.get_accessible_entity_ids(user.id)
    return Entry.entities.filter(pk__in=entity_ids).distinct()


def get_lsp_pack(user: CradleUser, classes: Iterable[EntryClass], initial: str = "") -> dict[str, dict[str, Any]]:
    """Build a map of subtype -> serialized trie for LSP completion from the given entry classes."""
    tries: dict[str, dict[str, Any]] = {}

    for eclass in classes:
        if eclass.type == EntryType.ENTITY:
            entries = get_entities(user).filter(entry_class=eclass)
            if initial:
                entries = entries.filter(name__istartswith=initial)
        elif eclass.options:
            trie = Trie()
            for opt in eclass.options.split("\n"):
                if stripped := opt.strip():
                    trie.insert(stripped)
            tries[eclass.subtype] = trie.serialize()
            continue
        else:
            entries = get_lsp_entries(user, eclass, initial)

        trie = Trie()
        if entries.exists():
            for entry in entries:
                trie.insert(entry.name)
            tries[eclass.subtype] = trie.serialize()

    return tries
