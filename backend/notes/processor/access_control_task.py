"""Check user has READ_WRITE access to all entity entries referenced by a note."""

from typing import Iterable, Tuple

from access.enums import AccessType
from access.models import Access
from entries.models import Entry

from ..exceptions import NoAccessToEntriesException
from ..models import Note
from .base_task import BaseTask


class AccessControlTask(BaseTask):
    @property
    def is_validator(self) -> bool:
        return True

    def run(self, note: Note, entries: Iterable[Entry]) -> Tuple[None, Iterable[Entry]]:
        """Check if the user has READ_WRITE access to all entity entries being referenced.

        Args:
            note: The note being processed.
            entries: The entries referenced by the note.

        Returns:
            Tuple of (None, entries).

        Raises:
            NoAccessToEntriesException: If any entity is inaccessible.
        """
        inaccessible = Access.objects.inaccessible_entries(
            self.user,
            Entry.objects.filter(pk__in=[e.id for e in entries]),
            {AccessType.READ_WRITE},
        )
        inaccessible_list = list(inaccessible)
        if inaccessible_list:
            raise NoAccessToEntriesException(inaccessible_list)
        return None, entries
