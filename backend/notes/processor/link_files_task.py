"""Task to link file references in a note to entries."""

from typing import Iterable, Tuple

from celery.canvas import Signature

from entries.models import Entry

from ..models import Note
from ..tasks import link_files_task
from .base_task import BaseTask


class LinkFilesTask(BaseTask):
    @property
    def is_validator(self) -> bool:
        return False

    def run(self, note: Note, entries: Iterable[Entry]) -> Tuple[Signature, Iterable[Entry]]:
        """Link file references in a note to entries (hashes, entities).

        Args:
            note: The note object being processed.
            entries: Entries from previous tasks (passed through).

        Returns:
            Tuple of (Celery task signature, entries).
        """
        return link_files_task.si(note.id), entries
