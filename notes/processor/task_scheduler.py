from typing import List, Optional

from celery import chain
from diff_match_patch import diff_match_patch

from notes.models import Note, Relation
from notes.processor.smart_linker_task import SmartLinkerTask

from .entry_population_task import EntryPopulationTask
from .entry_class_creation_task import EntryClassCreationTask

from .base_task import BaseTask
from .access_control_task import AccessControlTask
from .count_references_task import CountReferencesTask
from user.models import CradleUser

from django.db import transaction
from django.utils import timezone


class TaskScheduler:
    def __init__(self, user: CradleUser, **kwargs):
        self.user = user
        self.kwargs = kwargs

        self.processing: List[BaseTask] = [
            EntryClassCreationTask(user),
            EntryPopulationTask(user),
            AccessControlTask(user),
            CountReferencesTask(user),
            SmartLinkerTask(user),
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
        dmp = diff_match_patch()
        patches = None
        with transaction.atomic():
            if not note:
                note = Note.objects.create(author=self.user, **self.kwargs)
            else:
                patches = dmp.patch_make(
                    note.content, self.kwargs.get("content", note.content)
                )

                for i in self.kwargs:
                    setattr(note, i, self.kwargs[i])

                note.editor = self.user
                note.edit_timestamp = timezone.now()

            tasks = []

            for task in self.processing:
                async_task = task.run(note)
                if async_task:
                    tasks.append(async_task)

            task_chain = chain(*tasks)
            transaction.on_commit(lambda: task_chain.apply_async())
            note.save()

        if patches is None:
            note.log_create(self.user)
        else:
            note.log_edit(self.user, dmp.patch_toText(patches))

        return note
