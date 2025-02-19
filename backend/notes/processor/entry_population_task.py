from typing import Iterable, Tuple

from celery import Celery
from notes.exceptions import (
    EntriesDoNotExistException,
)
from ..utils import extract_links
from entries.enums import EntryType
from entries.models import Entry, EntryClass

from .base_task import BaseTask
from ..models import Note
from ..tasks import entry_population_task


class EntryPopulationTask(BaseTask):
    def run(
        self, note: Note, entries: Iterable[Entry]
    ) -> Tuple[Celery, Iterable[Entry]]:
        """
        Create the entries that are missing for a note.

        Args:
            note: The note object being processde

        Returns:
            The processed note object.
        """

        return entry_population_task.si(note.id, user_id=self.user.id), entries
