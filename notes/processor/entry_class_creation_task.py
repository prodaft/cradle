from notes.exceptions import EntryClassesDoNotExistException
from ..utils import extract_links
from entries.enums import EntryType
from entries.models import EntryClass

from .base_task import BaseTask
from ..models import Note

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

        # references will be a list of tuples which describe matches in
        # the note content

        nonexistent_entries = set()

        for r in note.reference_tree.links():
            if not EntryClass.objects.filter(subtype=r.key).exists():
                if not settings.AUTOREGISTER_ARTIFACT_TYPES:
                    nonexistent_entries.add(r.key)
                else:
                    entry = EntryClass.objects.create(
                        type=EntryType.ARTIFACT, subtype=r.key
                    )
                    entry.log_create(self.user)

        if nonexistent_entries:
            raise EntryClassesDoNotExistException(nonexistent_entries)

        return note
