from notes.exceptions import (
    EntriesDoNotExistException,
)
from ..utils import extract_links
from entries.enums import EntryType
from entries.models import Entry, EntryClass

from .base_task import BaseTask
from ..models import Note


class EntryPopulationTask(BaseTask):
    def run(self, note: Note) -> Note:
        """
        Create the entries that are missing for a note.

        Args:
            note: The note object being processde

        Returns:
            The processed note object.
        """

        # references will be a list of tuples which describe matches in
        # the note content

        for r in note.reference_tree.links():
            entry = Entry.objects.filter(name=r.value, entry_class__subtype=r.key)
            if len(entry) == 0:
                entry_class: EntryClass = EntryClass.objects.get(subtype=r.key)

                if entry_class.type == EntryType.ARTIFACT:
                    entry = Entry.objects.create(name=r.value, entry_class=entry_class)
                    entry.log_create(self.user)
                else:
                    raise EntriesDoNotExistException([r])
            else:
                entry = entry.first()

            note.entries.add(entry)

        return note
