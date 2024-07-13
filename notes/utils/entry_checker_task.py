from typing import Dict, Set
from entries.enums import EntryType
from entries.models import Entry
from ..exceptions import EntriesDoNotExistException


class EntryCheckerTask:
    def __apply_check_for_entry(
        self, subtype: str, referenced_entries: Set[Entry]
    ) -> Set[Entry]:
        """For the given entry type, check that all of the references exist
        in the database.

        Args:
            entry: Specifies the entry check
            referenced_entries: Set containing the references of that type

        Returns:
            True iff all referenced entries exist.

        Raises:
            EntriesDoNotExistException: The referenced entities do not exist.
        """

        referenced_names = [e.name for e in referenced_entries]
        existing_entries = set(
            Entry.objects.filter(
                entry_class__type=EntryType.ENTITY,
                entry_class__subtype=subtype,
                name__in=referenced_names
            )
        )

        if len(existing_entries) != len(referenced_entries):
            raise EntriesDoNotExistException()

        return existing_entries

    def run(
        self, referenced_entries: Dict[str, Dict[str, Set[Entry]]]
    ) -> Dict[str, Dict[str, Set[Entry]]]:
        """Checks that all of the referenced entities exist. If this
        holds, the entities are changed to their persisted versions.

        Args:
            referenced_entries: Dictionary containing sets of the entries being
            referenced in the note sent by the user.

        Returns:
            A new dictionary containing sets of entries being referenced. In the
            entity of this task, the entities are being updated to
            also contain their corresponding ids from the database.

        Raises:
            Http404: The referenced entities do not exist.
        """
        for i in referenced_entries[EntryType.ENTITY]:
            referenced_entries[EntryType.ENTITY][i] = self.__apply_check_for_entry(
                i, referenced_entries[EntryType.ENTITY][i]
            )

        return referenced_entries
