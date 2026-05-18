"""Cradle digest tasks: file downloads for notes."""

import logging

import requests
from celery import shared_task
from django.db import transaction

from file_transfer.models import FileReference
from file_transfer.s3_utils import put_bytes
from management.settings import cradle_settings
from notes.models import Note

from ..models.base import BaseDigest

logger = logging.getLogger(__name__)


@shared_task
def download_file_for_note(note_id, file_identifier, file_url, bucket_name, digest_id):
    """Download a file from the URL, store in MinIO, attach FileReference to Note."""
    try:
        digest = BaseDigest.objects.get(id=digest_id)
    except BaseDigest.DoesNotExist:
        logger.error("Digest with id %s does not exist.", digest_id)
        return

    try:
        note = Note.objects.get(id=note_id)
    except Note.DoesNotExist:
        logger.error("Note with id %s does not exist.", note_id)
        return

    try:
        r = requests.get(file_url, timeout=10)
        r.raise_for_status()  # Raise an HTTPError for bad responses

        file_data = r.content
        content_type = r.headers.get("Content-Type", "application/octet-stream")

        # Store into the shared files bucket under a UUID-prefixed key.
        fr = FileReference.objects.create(
            file_name=file_identifier,
            bucket_name=bucket_name,
        )
        object_key = f"{fr.id}-{file_identifier}"
        fr.file.name = object_key
        fr.minio_file_name = object_key
        fr.save(update_fields=["file", "minio_file_name"])

        put_bytes(
            bucket_name,
            object_key,
            body=file_data,
            content_type=content_type,
        )
        note.files.add(fr)
        note.save()

        # Trigger automatic processing
        if cradle_settings.files.autoprocess_files:
            fr.process_file()

        with transaction.atomic():
            instance = BaseDigest.objects.select_for_update().get(pk=digest.pk)
            instance.summary["files_downloaded"] += 1
            instance.save(update_fields=["summary"])
            digest = instance

    except Exception:
        digest._append_warning("A file linked from a note could not be downloaded.")
        logger.exception("Failed to download file for note %s", note_id)

        with transaction.atomic():
            instance = BaseDigest.objects.select_for_update().get(pk=digest.pk)
            instance.summary["files_failed"] += 1
            instance.save(update_fields=["summary"])
            digest = instance

    if digest.summary["files_scheduled"] == digest.summary["files_downloaded"] + digest.summary["files_failed"]:
        digest.finalize()
