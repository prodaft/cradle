from typing import List, Optional

from notes.models import Note

from .entry_population_task import EntryPopulationTask
from .entry_class_creation_task import EntryClassCreationTask

from .base_task import BaseTask
from .access_control_task import AccessControlTask
from .count_references_task import CountReferencesTask
from user.models import CradleUser

from django.db import transaction
from django.utils import timezone


class TaskScheduler:
    def __init__(self, note_content: str, user: CradleUser):
        self.user = user
        self.note_content = note_content

        self.processing: List[BaseTask] = [
            EntryClassCreationTask(),
            EntryPopulationTask(),
            AccessControlTask(user),
            CountReferencesTask(),
        ]

    def run_pipeline(self, note: Optional[Note] = None):
        """Performs all of the checks that are necessary for creating a note.
        First, it creates a dictionary mapping entry types to all of the referenced
        entries in the note. Then, it performs the mentioned checks. Lastly, it
        constructs a list of all referenced entries with the ids corresponding
        to the persisted entries.

        Returns:
            A list of all referenced entries. Their id fields are populated to
            correspond to the ids of persisted entries.

        Raises:
            NotEnoughReferencesException: if the note does not reference at
            least one entity and at least two entries.
            EntriesDoNotExistException: if the note references entities that do
            not exist.
            NoAccessToEntriesException: if the user does not have access to the
            referenced entities.
        """

        with transaction.atomic():
            if not note:
                note = Note.objects.create(content=self.note_content, author=self.user)
            else:
                note.editor = self.user
                note.edit_timestamp = timezone.now()

            note.content = self.note_content
            note.entries.clear()

            for task in self.processing:
                task.run(note)

            note.save()

            return note
