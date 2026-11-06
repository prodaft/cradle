"""Celery tasks for file processing.

process_file_task: compute hashes, mimetype; link files to notes.
reprocess_all_files_task: reprocess all files for metadata fixes, then notify the admin with a summary.
"""

import hashlib
import logging
from collections import Counter

from celery import chord, shared_task
from django.db import transaction

import file_transfer.uploads.tasks as _upload_tasks  # noqa: F401 - Celery autodiscover only loads this module, not uploads.tasks
from file_transfer.enums import FileProcessOutcome
from file_transfer.models import FileReference
from file_transfer.storage import FileTransferStorage
from management.settings import system_settings

logger = logging.getLogger("django.request")


@shared_task
def reprocess_all_files_task(user_id):
    """Reprocess every file (e.g. to fix metadata set wrongly at upload), then notify ``user_id`` with a summary."""
    from notifications.tasks import notify_user_task

    file_ids = list(FileReference.objects.values_list("id", flat=True))
    finished = files_reprocessed_task.s(user_id).on_error(
        notify_user_task.si(user_id, "Reprocess All Files failed. Check the worker logs for details.")
    )
    # The admin gets the summary, so the uploaders are not told about each failure. An empty header runs the
    # callback straight away, with no outcomes.
    chord([process_file_task.si(str(file_id), notify_owner=False) for file_id in file_ids])(finished)


@shared_task
def files_reprocessed_task(outcomes, user_id):
    """Chord callback of reprocess_all_files_task: notify ``user_id`` how many files were processed or failed."""
    from notifications.tasks import notify_user_task

    counts = Counter(outcomes)
    summary = ", ".join(
        f"{counts[outcome]} {outcome.label}"
        for outcome in FileProcessOutcome
        if counts[outcome] or outcome == FileProcessOutcome.PROCESSED
    )
    files = "file" if len(outcomes) == 1 else "files"
    notify_user_task(user_id, f"Reprocess All Files finished for {len(outcomes)} {files}: {summary}.")


@shared_task
def process_file_task(file_id, notify_owner=True):
    """Process a file to calculate hashes, mimetype, and file size.

    Uses django-storages to access file content. Returns a ``FileProcessOutcome``; with ``notify_owner``, the
    uploader is told when a step fails.
    """
    file_ref = FileReference.objects.filter(id=file_id).first()
    if file_ref is None:
        logger.warning(f"File reference {file_id} no longer exists; nothing to process")
        return FileProcessOutcome.SKIPPED
    try:
        return _process_file(file_ref, notify_owner)
    except Exception:
        # Counted as a failure rather than raised, so reprocessing all files still reports its summary.
        logger.exception(f"Unexpected error processing file {file_id}")
        return _file_processing_failed(file_ref, "an unexpected error occurred", notify_owner)


def _process_file(file_ref: FileReference, notify_owner: bool) -> FileProcessOutcome:
    """The steps of process_file_task, each recorded as a failure for the uploader instead of raising."""
    import magic

    file_id = file_ref.id
    if not file_ref.file:
        logger.error(f"File reference {file_id} has no file attached")
        return _file_processing_failed(file_ref, "it has no stored file", notify_owner)

    storage = FileTransferStorage()
    failed = None  # the last step that failed, for the uploader

    if file_ref.file_size is None:
        try:
            file_ref.file_size = storage.size(file_ref.file.name)
            file_ref.save(update_fields=["file_size"])
        except Exception as e:
            logger.error(f"Failed to fetch file size for {file_ref.file.name}: {str(e)}")
            failed = "its size could not be read"

    if file_ref.mime_type is None:
        try:
            with file_ref.file.open("rb") as f:
                header_bytes = f.read(8192)

            if header_bytes:
                mimetype = magic.from_buffer(header_bytes, mime=True)
                file_ref.mime_type = mimetype
                file_ref.save(update_fields=["mime_type"])
        except Exception as e:
            logger.error(f"Failed to fetch mimetype for {file_ref.file.name}: {str(e)}")
            return _file_processing_failed(file_ref, "its type could not be read", notify_owner)

    if (
        file_ref.file_size is not None
        and file_ref.file_size <= system_settings.files.max_file_size_for_hashing
        and not (file_ref.md5_hash and file_ref.sha1_hash and file_ref.sha256_hash)
    ):
        try:
            md5_hash = hashlib.md5()
            sha1_hash = hashlib.sha1()
            sha256_hash = hashlib.sha256()

            chunk_size = 8192  # 8KB chunks

            with file_ref.file.open("rb") as f:
                while True:
                    data = f.read(chunk_size)
                    if not data:
                        break
                    md5_hash.update(data)
                    sha1_hash.update(data)
                    sha256_hash.update(data)

            file_ref.md5_hash = md5_hash.hexdigest()
            file_ref.sha1_hash = sha1_hash.hexdigest()
            file_ref.sha256_hash = sha256_hash.hexdigest()
            file_ref.save(update_fields=["md5_hash", "sha1_hash", "sha256_hash"])
        except Exception as e:
            logger.error(f"Error processing file {file_ref.file.name}: {str(e)}")
            failed = "its hashes could not be computed"

    if file_ref.note:
        from notes.tasks import link_files_task

        transaction.on_commit(lambda: link_files_task.apply_async(args=(str(file_ref.note.id),)))

    if failed:
        return _file_processing_failed(file_ref, failed, notify_owner)
    return FileProcessOutcome.PROCESSED


def _file_processing_failed(file_ref: FileReference, reason: str, notify_owner: bool) -> FileProcessOutcome:
    """Tell the uploader (with ``notify_owner``) why ``file_ref`` could not be fully processed."""
    from notifications.models import MessageNotification

    if notify_owner and file_ref.user_id:
        MessageNotification.objects.create(
            user_id=file_ref.user_id,
            message=f'The file "{file_ref.file_name}" could not be fully processed: {reason}.',
        )
    return FileProcessOutcome.FAILED
