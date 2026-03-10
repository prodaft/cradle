"""Task scheduler that runs the note processing pipeline (validate, populate, link, etc.)."""

from typing import List, Optional

from celery import chain
from diff_match_patch import diff_match_patch
from django.db import transaction
from django.utils import timezone

from entries.enums import EntryType
from user.models import CradleUser

from ..enums import NoteStatus
from ..exceptions import (
    FieldTooLongException,
)
from ..models import Note
from ..utils import calculate_acvec
from .access_control_task import AccessControlTask
from .base_task import BaseTask
from .connect_aliases_task import AliasConnectionTask
from .entry_class_creation_task import EntryClassCreationTask
from .entry_population_task import EntryPopulationTask
from .finalize_note_task import FinalizeNoteTask
from .link_files_task import LinkFilesTask
from .metadata_process_task import MetadataProcessTask
from .smart_linker_task import SmartLinkerTask
from .validate_note_task import ValidateNoteTask

TASKS = [
    ValidateNoteTask,
    AccessControlTask,
    EntryClassCreationTask,
    EntryPopulationTask,
    SmartLinkerTask,
    LinkFilesTask,
    MetadataProcessTask,
    AliasConnectionTask,
    FinalizeNoteTask,
]


class TaskScheduler:
    """Runs the note processing pipeline: validation, entry creation, linking, metadata, finalize."""

    def __init__(self, user: CradleUser, tasks: List[BaseTask] = TASKS, **kwargs):
        self.user = user
        self.kwargs = kwargs

        self.processing: List[BaseTask] = [task(user) for task in tasks]

    def run_pipeline(
        self,
        note: Optional[Note] = None,
        validate: bool = True,
        update_acvec: bool = True,
    ):
        """Perform checks for creating a note and build referenced entries list.

        Maps entry types to referenced entries, runs validation, returns entries
        with persisted IDs.

        Returns:
            A list of all referenced entries. Their id fields are populated to
            correspond to the ids of persisted entries.

        Raises:
            NotEnoughReferencesException: When the note does not reference at
                least one entity and at least two entries.
            EntriesDoNotExistException: When the note references entities that
                do not exist.
            NoAccessToEntriesException: When the user does not have access to
                the referenced entities.
        """
        dmp = diff_match_patch()
        patches = None
        with transaction.atomic():
            if not note:
                note = Note.objects.create(author=self.user, **self.kwargs)
            else:
                patches = dmp.patch_make(note.content, self.kwargs.get("content", note.content))

                for i in self.kwargs:
                    setattr(note, i, self.kwargs[i])

                if patches:
                    note.editor = self.user
                    note.edit_timestamp = timezone.now()

            entries = []
            tasks = []

            for task in self.processing:
                if task.is_validator and not validate:
                    continue

                async_task, entries = task.run(note, entries)
                if async_task:
                    tasks.append(async_task)

            task_chain = chain(*tasks)

            transaction.on_commit(lambda: task_chain.apply_async())

            if update_acvec:
                note.access_vector = calculate_acvec([x for x in entries if x.entry_class.type == EntryType.ENTITY])

            if len(note.description) > Note.description.field.max_length:
                raise FieldTooLongException("description", Note.description.field.max_length)

            if len(note.title) > Note.title.field.max_length:
                raise FieldTooLongException("title", Note.title.field.max_length)

            note.set_status(NoteStatus.PROCESSING)
            note.metadata = None
            note.save()

        if patches is None:
            patches = dmp.patch_make("", note.content)

            note.log_create(self.user, dmp.patch_toText(patches) if patches else None)
        elif len(patches) > 0:
            note.log_edit(self.user, dmp.patch_toText(patches))

        return note
