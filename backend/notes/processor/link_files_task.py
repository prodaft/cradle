from typing import Iterable, Tuple

from celery import Celery
from entries.models import Entry

from .base_task import BaseTask
from ..models import Note
from ..tasks import link_files_task


class LinkFilesTask(BaseTask):
    @property
    def is_validator(self) -> bool:
        return False

    def run(
        self, note: Note, entries: Iterable[Entry]
    ) -> Tuple[Celery, Iterable[Entry]]:
        """
        Create the links between the entries, using the note

        Args:
            note: The note object being processde

        Returns:
            The processed note object.
        """
        return link_files_task.si(note.id), entries
