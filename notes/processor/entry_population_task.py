from notes.exceptions import (
    EntriesDoNotExistException,
)
from ..utils import extract_links
from entries.enums import EntryType
from entries.models import Entry, EntryClass

from .base_task import BaseTask
from ..models import Note

from django.conf import settings


class EntryPopulationTask(BaseTask):
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

        for r in extract_links(note.content):
            entry = Entry.objects.filter(
                name=r.name, entry_class__subtype=r.class_subtype
            )
            if len(entry) == 0:
                entry_class: EntryClass = EntryClass.objects.get(
                    subtype=r.class_subtype
                )

                if entry_class.type == EntryType.ARTIFACT:
                    entry = Entry.objects.create(name=r.name, entry_class=entry_class)
                    entry.log_create(self.user)
                else:
                    raise EntriesDoNotExistException([r])
            else:
                entry = entry.first()

            note.entries.add(entry)

        return note
