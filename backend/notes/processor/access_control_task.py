from typing import Iterable, Tuple
from access.enums import AccessType
from access.models import Access
from entries.models import Entry
from entries.enums import EntryType
from notes.exceptions import (
    NoAccessToEntriesException,
)

from .base_task import BaseTask
from ..models import Note


class AccessControlTask(BaseTask):
    def run(self, note: Note, entries: Iterable[Entry]) -> Tuple[None, Iterable[Entry]]:
        """
        Check if the user has access to all the entries being refenced

        Args:
            note: The note object being processde

        Returns:
            The processed note object.
        """

        access_level = {AccessType.READ_WRITE}

        entities = set(
            [x.id for x in entries if x.entry_class.type == EntryType.ENTITY]
        )

        inaccessible = Access.objects.inaccessible_entries(
            self.user,
            Entry.objects.filter(pk__in=entities),
            access_level,
        )

        for i in inaccessible.all():
            raise NoAccessToEntriesException([i])

        return None, entries
