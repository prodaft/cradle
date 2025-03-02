from collections.abc import Iterable
from typing import Dict, List, Any

from django.db.models import Q
from entries.enums import EntryType
from entries.models import Entry, EntryClass
from notes.models import Note
from user.models import CradleUser
from access.models import Access


class TrieNode:
    def __init__(self):
        self.children = {}
        self.eow = False


class Trie:
    def __init__(self):
        self.root = TrieNode()

    def insert(self, word):
        """Inserts a word into the trie."""
        current_node = self.root
        for char in word:
            if char not in current_node.children:
                current_node.children[char] = TrieNode()
            current_node = current_node.children[char]
        current_node.eow = True

    def search(self, word):
        """Searches for a word in the trie."""
        current_node = self.root
        for char in word:
            if char not in current_node.children:
                return False
            current_node = current_node.children[char]
        return current_node.eow

    def starts_with(self, prefix):
        """Checks if any word in the trie starts with the given prefix."""
        current_node = self.root
        for char in prefix:
            if char not in current_node.children:
                return False
            current_node = current_node.children[char]
        return True

    def serialize(self):
        """Serializes the trie into a dictionary."""

        def _serialize_node(node):
            serialized = {"eow": node.eow, "c": {}}
            for char, child_node in node.children.items():
                serialized["c"][char] = _serialize_node(child_node)
            return serialized

        return _serialize_node(self.root)


class LspUtils:
    @staticmethod
    def get_lsp_entries(user: CradleUser, eclass: EntryClass) -> List[Entry]:
        accessible_notes = Note.objects.get_accessible_notes(user, None)
        accessible_entries = Note.objects.get_entries_from_notes(
            accessible_notes
        ).filter(entry_class=eclass)

        return accessible_entries

    @staticmethod
    def get_entities(user: CradleUser) -> List[Entry]:
        if user.is_cradle_admin:
            return Entry.entities.all().distinct()

        entity_ids = Access.objects.get_accessible_entity_ids(user.id)
        return Entry.entities.filter(pk__in=entity_ids).distinct()

    @staticmethod
    def get_lsp_pack(
        user: CradleUser,
        classes: Iterable[EntryClass],
    ) -> Dict[str, Dict[str, Any]]:
        tries = {}

        for eclass in classes:
            if eclass.type == EntryType.ENTITY:
                entries = LspUtils.get_entities(user)
            else:
                entries = LspUtils.get_lsp_entries(user, eclass)

            trie = Trie()
            if entries.count() > 0:
                for entry in entries:
                    trie.insert(entry.name)
                tries[eclass.subtype] = trie.serialize()

        return tries
