"""Task that schedules NOTE graph relations (note hub->entities, artifact<->entity clique)."""

from typing import Iterable, Tuple

from celery.canvas import Signature

from entries.models import Entry

from ..models import Note
from ..tasks import smart_linker_task
from .base_task import BaseTask


class SmartLinkerTask(BaseTask):
    @property
    def is_validator(self) -> bool:
        return False

    def run(self, note: Note, entries: Iterable[Entry]) -> Tuple[Signature, Iterable[Entry]]:
        """Schedule NOTE graph relations (note hub->entities, artifact<->entity clique).

        Args:
            note: The note object being processed.
            entries: Entries from previous tasks (passed through).

        Returns:
            Tuple of (Celery task signature, entries).
        """
        return smart_linker_task.si(note.id, user_id=self.user.id if self.user else None), entries
