from notes.exceptions import EntryClassesDoNotExistException
from ..utils import extract_links
from entries.enums import EntryType
from entries.models import EntryClass

from .base_task import BaseTask
from ..models import Note
from ..tasks import entry_class_creation_task

from django.conf import settings


class EntryClassCreationTask(BaseTask):
    def run(self, note: Note) -> Note:
        """
        Create the entry classes that are missing for a note.

        Args:
            note: The note object being processde

        Returns:
            The processed note object.
        """
        return entry_class_creation_task.si(note.id, self.user.id)
