from typing import Dict, Set
from entries.models import Entry
from ..exceptions import NotEnoughReferencesException


class CountReferencesTask:

    def run(
        self, referenced_entries: Dict[str, Set[Entry]]
    ) -> Dict[str, Set[Entry]]:
        """Checks that the note references at least one case and at least 2 entries
        (including the referenced cases).

        Args:
            referenced_entries: Dictionary containing sets of the entries being
            referenced in the note sent by the user.

        Returns:
            An updated dictionary containing sets of the entries. In the case of this
            task, the dictionary is not updated.

        Raises:
            NotEnoughReferencesException: The note does not reference at least one case
                and at least two entries.
        """

        referenced_cases = len(referenced_entries["case"])
        reference_count = sum(
            len(entry_set) for entry_set in referenced_entries.values()
        )

        if referenced_cases == 0 or reference_count < 2:
            raise NotEnoughReferencesException()

        return referenced_entries
