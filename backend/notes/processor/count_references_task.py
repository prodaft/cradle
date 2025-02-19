from entries.models import Entry, EntryClass
from notes.exceptions import (
    NotEnoughReferencesException,
)
from entries.enums import EntryType

from .base_task import BaseTask
from ..models import Note

from django.conf import Settings, settings


class CountReferencesTask(BaseTask):
    def run(self, note: Note) -> Note:
        """
        Create the entry classes that are missing for a note.

        Args:
            note: The note object being processde

        Returns:
            The processed note object.
        """
        entity_count = 0
        total_count = 0
        for r in note.reference_tree.links():
            eclass = EntryClass.objects.filter(subtype=r.key)

            if eclass.exists() and eclass.first().type == EntryType.ENTITY:
                entity_count += 1

            if eclass.exists() or settings.AUTOREGISTER_ARTIFACT_TYPES:
                total_count += 1

            if (
                entity_count >= settings.MIN_ENTITY_COUNT_PER_NOTE
                and total_count >= settings.MIN_ENTRY_COUNT_PER_NOTE
            ):
                return None

        if entity_count < settings.MIN_ENTITY_COUNT_PER_NOTE:
            raise NotEnoughReferencesException()

        if total_count < settings.MIN_ENTRY_COUNT_PER_NOTE:
            raise NotEnoughReferencesException()
