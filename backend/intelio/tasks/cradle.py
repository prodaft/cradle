"""Cradle digest tasks: file downloads for notes."""

import logging
import posixpath
import tempfile
from urllib.parse import ParseResult, parse_qs, unquote, urlparse

from celery import shared_task
from django.conf import settings
from django.db import transaction

from core.safe_fetch import fetch_url
from file_transfer.models import FileReference
from file_transfer.s3_utils import put_bytes
from file_transfer.uploads.flows import sanitize_upload_filename
from management.settings import cradle_settings
from notes.models import Note

from ..models.base import BaseDigest

logger = logging.getLogger(__name__)

# Downloads larger than this are buffered on disk instead of in memory.
SPOOL_MAX_MEMORY = 16 * 1024 * 1024


def _origin(parsed: ParseResult) -> tuple[str, str, int | None]:
    default_port = {"http": 80, "https": 443}.get(parsed.scheme)
    return parsed.scheme, (parsed.hostname or "").lower(), parsed.port or default_port


def _is_own_storage_url(parsed: ParseResult, bucket_name: str) -> bool:
    """Whether ``parsed`` is a presigned GET into our own bucket, as written by the JSON export.

    Our storage usually sits on a private address, so these skip the public-address check.
    The signature is still verified by the storage server, and the path must stay inside
    the bucket (nginx routes everything else on the public host to the app).
    """
    endpoints = [settings.AWS_S3_ENDPOINT_URL, settings.AWS_S3_PUBLIC_ENDPOINT_URL]
    if _origin(parsed) not in {_origin(urlparse(e)) for e in endpoints if e}:
        return False
    path = unquote(parsed.path)
    if not path.startswith(f"/{bucket_name}/") or "\\" in path or posixpath.normpath(path) != path:
        return False
    return "X-Amz-Signature" in parse_qs(parsed.query)


def _is_trusted_host(parsed: ParseResult) -> bool:
    return (parsed.hostname or "").lower() in {h.lower() for h in settings.DIGEST_TRUSTED_FILE_HOSTS}


@shared_task
def download_file_for_note(note_id, file_identifier, file_url, bucket_name, digest_id):
    """Download a file from the URL, store in MinIO, attach FileReference to Note."""
    try:
        digest = BaseDigest.objects.get(id=digest_id)
    except BaseDigest.DoesNotExist:
        logger.error("Digest with id %s does not exist.", digest_id)
        return

    file_identifier = sanitize_upload_filename(str(file_identifier), default="file")

    try:
        note = Note.objects.get(id=note_id)
        with tempfile.SpooledTemporaryFile(max_size=SPOOL_MAX_MEMORY) as file_data:
            content_type = fetch_url(
                file_url,
                file_data,
                max_bytes=digest.user.file_upload_limit,
                is_trusted=lambda parsed: _is_own_storage_url(parsed, bucket_name) or _is_trusted_host(parsed),
            )
            file_data.seek(0)

            fr = FileReference.objects.create(file_name=file_identifier)
            object_key = f"{fr.id}-{file_identifier}"
            fr.file.name = object_key
            fr.save(update_fields=["file"])

            put_bytes(
                bucket_name,
                object_key,
                body=file_data,
                content_type=content_type,
            )
        note.files.add(fr)

        if cradle_settings.files.autoprocess_files:
            fr.process_file()

        with transaction.atomic():
            instance = BaseDigest.objects.select_for_update().get(pk=digest.pk)
            instance.summary["files_downloaded"] += 1
            instance.save(update_fields=["summary"])
            digest = instance

    except Exception:
        digest.append_warning("A file linked from a note could not be downloaded.")
        logger.exception("Failed to download file for note %s", note_id)

        with transaction.atomic():
            instance = BaseDigest.objects.select_for_update().get(pk=digest.pk)
            instance.summary["files_failed"] += 1
            instance.save(update_fields=["summary"])
            digest = instance

    if digest.summary["files_scheduled"] == digest.summary["files_downloaded"] + digest.summary["files_failed"]:
        digest.finalize()
