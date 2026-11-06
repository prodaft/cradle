"""Task to create missing entries for a note."""

from typing import Iterable, Tuple

from celery.canvas import Signature

from entries.models import Entry

from ..models import Note
from ..tasks import entry_population_task
from .base_task import BaseTask


class EntryPopulationTask(BaseTask):
    @property
    def is_validator(self) -> bool:
        return False

    def run(self, note: Note, entries: Iterable[Entry]) -> Tuple[Signature, Iterable[Entry]]:
        """Create the entries that are missing for a note.

        Args:
            note: The note object being processed.
            entries: Entries from previous tasks (passed through).

        Returns:
            Tuple of (Celery task signature, entries).
        """
        return (
            entry_population_task.si(note.id, user_id=self.user.id if self.user else None),
            entries,
        )
