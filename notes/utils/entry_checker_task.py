from typing import Dict, Set
from entries.models import Entry
from ..exceptions import EntriesDoNotExistException


class EntryCheckerTask:

    __checked_entries = {"actor", "case"}

    def __apply_check_for_entry(
        self, entry: str, referenced_entries: Set[Entry]
    ) -> Set[Entry]:
        """For the given entry type, check that all of the references exist
        in the database.

        Args:
            entry: Specifies the entry check
            referenced_entries: Set containing the references of that type

        Returns:
            True iff all referenced entries exist.

        Raises:
            EntriesDoNotExistException: The referenced actors or cases do not exist.
        """

        referenced_names = [e.name for e in referenced_entries]
        existing_entries = set(
            Entry.objects.filter(type=entry, name__in=referenced_names)
        )

        if len(existing_entries) != len(referenced_entries):
            raise EntriesDoNotExistException()

        return existing_entries

    def run(
        self, referenced_entries: Dict[str, Set[Entry]]
    ) -> Dict[str, Set[Entry]]:
        """Checks that all of the referenced cases and actors exist. If this
        holds, the cases and actors are changed to their persisted versions.

        Args:
            referenced_entries: Dictionary containing sets of the entries being
            referenced in the note sent by the user.

        Returns:
            A new dictionary containing sets of entries being referenced. In the
            case of this task, the case and actor entries are being updated to
            also contain their corresponding ids from the database.

        Raises:
            Http404: The referenced actors or cases do not exist.
        """

        for entry_type in self.__checked_entries:
            referenced_entries[entry_type] = self.__apply_check_for_entry(
                entry_type, referenced_entries[entry_type]
            )

        return referenced_entries
