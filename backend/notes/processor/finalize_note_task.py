"""Task to mark note as healthy when processing complete."""

from typing import Iterable, Tuple

from celery.canvas import Signature

from entries.models import Entry

from ..models import Note
from ..tasks import note_finalize_task
from .base_task import BaseTask


class FinalizeNoteTask(BaseTask):
    @property
    def is_validator(self) -> bool:
        return False

    def run(self, note: Note, entries: Iterable[Entry]) -> Tuple[Signature, Iterable[Entry]]:
        """Mark note as healthy when processing complete.

        Args:
            note: The note object being processed.
            entries: Entries from previous tasks (passed through).

        Returns:
            Tuple of (Celery task signature, entries).
        """
        return note_finalize_task.si(note.id), entries
