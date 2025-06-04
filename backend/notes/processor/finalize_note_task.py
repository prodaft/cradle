from typing import Iterable, Tuple
from entries.models import Entry

from .base_task import BaseTask
from ..models import Note
from ..tasks import note_finalize_task


class FinalizeNoteTask(BaseTask):
    @property
    def is_validator(self) -> bool:
        return False

    def run(self, note: Note, entries: Iterable[Entry]) -> Tuple[None, Iterable[Entry]]:
        """
        Create the entry classes that are missing for a note.

        Args:
            note: The note object being processde

        Returns:
            The processed note object.
        """
        return note_finalize_task.si(note.id), entries
