import hashlib
import logging

from celery import shared_task
from django.db import transaction
from django.utils import timezone

from file_transfer.models import FileReference, PendingUpload
from file_transfer.s3_utils import delete_object
from file_transfer.storage import FileTransferStorage
from management.settings import cradle_settings

logger = logging.getLogger("django.request")


def get_storage():
    """Get the file transfer storage instance."""
    return FileTransferStorage()


@shared_task
def reprocess_all_files_task():
    """
    Reprocess all files in the system to ensure they have the correct metadata.
    This task is useful for fixing issues with file metadata that may have been
    incorrectly set during initial processing.
    """
    for file_ref in FileReference.objects.all():
        try:
            file_ref.process_file()
        except Exception as e:
            logger.error(f"Error reprocessing file {file_ref.id}: {str(e)}")


@shared_task
def process_file_task(file_id):
    """
    Process a file to calculate hashes, mimetype, and file size.
    Uses django-storages to access file content.
    """
    import magic

    # Get the file reference
    file_ref = FileReference.objects.get(id=file_id)

    if not file_ref.file:
        logger.error(f"File reference {file_id} has no file attached")
        return

    storage = get_storage()

    # Fetch the file size if it is not set
    if file_ref.file_size is None:
        try:
            file_ref.file_size = storage.size(file_ref.file.name)
            file_ref.save(update_fields=["file_size"])
        except Exception as e:
            logger.error(
                f"Failed to fetch file size for {file_ref.file.name}: {str(e)}"
            )

    # Fetch the mimetype if it is not set
    if file_ref.mimetype is None:
        try:
            with file_ref.file.open("rb") as f:
                header_bytes = f.read(8192)

            if header_bytes:
                mimetype = magic.from_buffer(header_bytes, mime=True)
                file_ref.mimetype = mimetype
                file_ref.save(update_fields=["mimetype"])
        except Exception as e:
            logger.error(f"Failed to fetch mimetype for {file_ref.file.name}: {str(e)}")
            return

    # Calculate hashes if file is small enough
    if (
        file_ref.file_size is not None
        and file_ref.file_size <= cradle_settings.files.max_file_size_for_hashing
        and not (file_ref.md5_hash and file_ref.sha1_hash and file_ref.sha256_hash)
    ):
        try:
            # Initialize hash objects
            md5_hash = hashlib.md5()
            sha1_hash = hashlib.sha1()
            sha256_hash = hashlib.sha256()

            # Read and update hash in chunks
            chunk_size = 8192  # 8KB chunks

            with file_ref.file.open("rb") as f:
                while True:
                    data = f.read(chunk_size)
                    if not data:
                        break
                    md5_hash.update(data)
                    sha1_hash.update(data)
                    sha256_hash.update(data)

            # Store the hexadecimal digest of the hashes
            file_ref.md5_hash = md5_hash.hexdigest()
            file_ref.sha1_hash = sha1_hash.hexdigest()
            file_ref.sha256_hash = sha256_hash.hexdigest()
            file_ref.save(update_fields=["md5_hash", "sha1_hash", "sha256_hash"])
        except Exception as e:
            logger.error(f"Error processing file {file_ref.file.name}: {str(e)}")

    # Link files to entries if note is attached
    if file_ref.note:
        from notes.tasks import link_files_task

        transaction.on_commit(
            lambda: link_files_task.apply_async(args=(str(file_ref.note.id),))
        )


@shared_task
def cleanup_expired_upload(pending_upload_id: str):
    """
    Clean up an expired pending upload.

    Deprecated: This task delegates to the generic cleanup task.
    Use file_transfer.uploads.tasks.cleanup_expired_upload_generic instead.
    """
    from .uploads.tasks import cleanup_expired_upload_generic

    cleanup_expired_upload_generic(
        pending_upload_id,
        "file_transfer.PendingUpload",
        FileTransferStorage.bucket_name,
    )


@shared_task
def cleanup_expired_uploads():
    """
    Periodic task to clean up all expired pending uploads.

    Deprecated: This task delegates to the generic cleanup task.
    Use file_transfer.uploads.tasks.cleanup_all_expired_uploads instead.
    """
    from .uploads.tasks import cleanup_all_expired_uploads

    cleanup_all_expired_uploads()
