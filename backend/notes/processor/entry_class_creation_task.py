from typing import Iterable, Optional, Tuple
from notes.exceptions import EntryClassesDoNotExistException
from ..utils import extract_links
from entries.enums import EntryType
from entries.models import Entry, EntryClass

from .base_task import BaseTask
from ..models import Note
from ..tasks import entry_class_creation_task

from django.conf import settings


class EntryClassCreationTask(BaseTask):
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
        return entry_class_creation_task.si(note.id, self.user.id), entries
