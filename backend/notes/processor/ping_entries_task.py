from typing import Iterable, Tuple

from celery import Celery
from entries.models import Entry

from .base_task import BaseTask
from ..models import Note
from ..tasks import ping_entries


class PingEntriesTask(BaseTask):
    @property
    def is_validator(self) -> bool:
        return False

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

        return ping_entries.si(note.id), entries
