from notes.exceptions import (
    NotEnoughReferencesException,
)
from entries.enums import EntryType

from .base_task import BaseTask
from ..models import Note

from django.conf import settings


class CountReferencesTask(BaseTask):
    def run(self, note: Note) -> Note:
        """
        Create the entry classes that are missing for a note.

        Args:
            note: The note object being processde

        Returns:
            The processed note object.
        """

        # references will be a list of tuples which describe matches in
        # the note content

        entity_count = note.entries.filter(entry_class__type=EntryType.ENTITY).count()

        if entity_count < settings.MIN_ENTITY_COUNT_PER_NOTE:
            raise NotEnoughReferencesException()

        if note.entries.count() < settings.MIN_ENTRY_COUNT_PER_NOTE:
            raise NotEnoughReferencesException()
