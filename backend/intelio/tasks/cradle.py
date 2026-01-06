import logging
import traceback

import requests
from celery import shared_task
from django.db import transaction

from file_transfer.models import FileReference
from file_transfer.s3_utils import put_bytes
from file_transfer.storage import FileTransferStorage
from intelio.models.base import BaseDigest
from management.settings import cradle_settings
from notes.models import Note

logger = logging.getLogger(__name__)


@shared_task
def download_file_for_note(note_id, file_identifier, file_url, bucket_name, digest_id):
    """
    Downloads a file from the given URL, stores it in Minio, and attaches
    the resulting FileReference to the Note with the provided note_id.
    """
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
        print(file_url)
        r = requests.get(file_url, timeout=10)
        r.raise_for_status()  # Raise an HTTPError for bad responses

        file_data = r.content
        content_type = r.headers.get("Content-Type", "application/octet-stream")

        # Store into the shared files bucket under a UUID-prefixed key.
        bucket_name = FileTransferStorage.bucket_name
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

    except Exception as e:
        digest._append_warning(f"Failed to download file for note {note_id}: {e}")
        traceback.print_exc()

        with transaction.atomic():
            instance = BaseDigest.objects.select_for_update().get(pk=digest.pk)
            instance.summary["files_failed"] += 1
            instance.save(update_fields=["summary"])
            digest = instance

    print(digest.summary)
    if (
        digest.summary["files_scheduled"]
        == digest.summary["files_downloaded"] + digest.summary["files_failed"]
    ):
        digest.finalize()
