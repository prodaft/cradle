"""Task to process metadata frontmatter and set note fields."""

from typing import Iterable, Tuple

from celery.canvas import Signature

from entries.models import Entry

from ..models import Note
from ..tasks import note_metadata_process_task
from .base_task import BaseTask


class MetadataProcessTask(BaseTask):
    @property
    def is_validator(self) -> bool:
        return False

    def run(self, note: Note, entries: Iterable[Entry]) -> Tuple[Signature, Iterable[Entry]]:
        """Process the metadata frontmatter of a note and set relevant fields.

        Args:
            note: The note object being processed.
            entries: Entries from previous tasks (passed through).

        Returns:
            Tuple of (Celery task signature, entries).
        """
        return note_metadata_process_task.si(note.id), entries
