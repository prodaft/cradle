from typing import Iterable, Tuple

from entries.models import Entry

from ..models import Note
from ..tasks import note_metadata_process_task
from .base_task import BaseTask


class MetadataProcessTask(BaseTask):
    @property
    def is_validator(self) -> bool:
        return False

    def run(self, note: Note, entries: Iterable[Entry]) -> Tuple[Note, Iterable[Entry]]:
        """
        Process the metadata frontmatter of a note and set relevant fields.

        Args:
            note: The note object being processde

        Returns:
            The processed note object.
        """
        return note_metadata_process_task.si(note.id), entries
