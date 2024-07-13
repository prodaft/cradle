from typing import Dict, Set
from entries.enums import EntryType
from entries.models import Entry
from ..exceptions import NotEnoughReferencesException


class CountReferencesTask:

    def run(
        self, referenced_entries: Dict[str, Dict[str, Set[Entry]]]
    ) -> Dict[str, Dict[str, Set[Entry]]]:
        """Checks that the note references at least one entity and at least 2 entries
        (including the referenced entities).

        Args:
            referenced_entries: Dictionary containing sets of the entries being
            referenced in the note sent by the user.

        Returns:
            An updated dictionary containing sets of the entries. In the entity of this
            task, the dictionary is not updated.

        Raises:
            NotEnoughReferencesException: The note does not reference at least one entity
                and at least two entries.
        """


        reference_count = sum(
            len(entry_set) for entry_set in referenced_entries.values()
        )

        if reference_count == 0:
            raise NotEnoughReferencesException()

        return referenced_entries
