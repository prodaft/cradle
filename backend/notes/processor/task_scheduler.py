"""Task scheduler that runs the note processing pipeline (validate, populate, link, etc.)."""

from typing import List, Optional

from celery import chain
from celery.canvas import Signature
from diff_match_patch import diff_match_patch
from django.db import transaction
from django.utils import timezone

from core.exceptions import CradleAPIException
from entries.enums import EntryType
from entries.models import calculate_acvec
from user.models import CradleUser

from ..constants import NOTES_TASK_SCHEDULER_DEFAULT_PIPELINE
from ..enums import NoteStatus
from ..exceptions import (
    MaxLengthExceededException,
)
from ..models import Note
from ..tasks import note_processing_failed_task
from .base_task import BaseTask


class TaskScheduler:
    """Runs the note processing pipeline: validation, entry creation, linking, metadata, finalize."""

    def __init__(self, user: CradleUser, tasks: List[type[BaseTask]] | None = None, **kwargs):
        self.user = user
        self.kwargs = kwargs

        pipeline = tasks if tasks is not None else NOTES_TASK_SCHEDULER_DEFAULT_PIPELINE
        self.processing: List[BaseTask] = [task(user) for task in pipeline]
        self.tasks_to_run: List[Signature] = []

    def run_pipeline(
        self,
        note: Optional[Note] = None,
        validate: bool = True,
        update_acvec: bool = True,
        allow_invalid: bool = False,
        queue_tasks: bool = True,
    ):
        """Perform checks for creating a note and build referenced entries list.

        Maps entry types to referenced entries, runs validation, returns entries
        with persisted IDs.

        With ``allow_invalid``, a note that fails validation is still saved, as INVALID with
        the problems in its status: it keeps its last processed entries and links (nothing is
        processed until it is valid again), and its access vector only ever narrows, so an
        invalid edit can't expose the note to anyone who couldn't read it before or after.
        Access checks on the links that did resolve still apply.

        With ``queue_tasks=False``, the processing tasks are left in ``tasks_to_run`` for the caller to run
        instead of being queued on commit.

        Returns:
            A list of all referenced entries. Their id fields are populated to
            correspond to the ids of persisted entries.

        Raises:
            NotEnoughReferencesException: When the note does not reference at
            least one entity and at least two entries.
            EntriesNotFoundException: When the note references entities that
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
                    note.updated_at = timezone.now()

            entries = []
            tasks = []
            invalid = None

            for task in self.processing:
                if task.is_validator and not validate:
                    continue

                try:
                    async_task, entries = task.run(note, entries)
                except CradleAPIException as e:
                    if not (allow_invalid and task.is_validator and hasattr(e, "valid_entries")):
                        raise
                    invalid, entries = e, e.valid_entries
                    continue
                if async_task:
                    tasks.append(async_task)

            self.tasks_to_run = tasks if not invalid else []
            if tasks and not invalid and queue_tasks:
                task_chain = chain(*tasks).on_error(note_processing_failed_task.si(note.id))
                transaction.on_commit(lambda c=task_chain: c.apply_async())

            if update_acvec:
                acvec = calculate_acvec([x for x in entries if x.entry_class.type == EntryType.ENTITY])
                note.access_vector = acvec | (note.access_vector or 0) if invalid else acvec

            if len(note.description) > Note.description.field.max_length:
                raise MaxLengthExceededException("description", Note.description.field.max_length)

            if len(note.title) > Note.title.field.max_length:
                raise MaxLengthExceededException("title", Note.title.field.max_length)

            if invalid:
                note.set_status(NoteStatus.INVALID, str(invalid.detail), invalid.link_issues)
            else:
                note.set_status(NoteStatus.PROCESSING)
                note.metadata = None
            note.save()

        if patches is None:
            patches = dmp.patch_make("", note.content)

            note.log_create(self.user, dmp.patch_toText(patches) if patches else None)
        elif len(patches) > 0:
            note.log_edit(self.user, dmp.patch_toText(patches))

        return note
