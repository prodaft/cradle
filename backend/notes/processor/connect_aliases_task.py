"""Task to create alias entries and relations from note reference tree."""

from typing import Iterable, Tuple

from celery.canvas import Signature

from entries.models import Entry

from ..models import Note
from ..tasks import connect_aliases
from .base_task import BaseTask


class AliasConnectionTask(BaseTask):
    @property
    def is_validator(self) -> bool:
        return False

    def run(self, note: Note, entries: Iterable[Entry]) -> Tuple[Signature, Iterable[Entry]]:
        """Create alias entries and relations from note reference tree.

        Args:
            note: The note object being processed.
            entries: Entries from previous tasks (passed through).

        Returns:
            Tuple of (Celery task signature, entries).
        """
        return connect_aliases.si(note.id, self.user.id if self.user else None), entries
