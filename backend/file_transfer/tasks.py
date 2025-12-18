import hashlib
import logging

from celery import shared_task
from django.db import transaction

from file_transfer.models import FileReference
from file_transfer.utils import MinioClient
from management.settings import cradle_settings
from user.models import CradleUser

logger = logging.getLogger("django.request")


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
            logger.error(
                f"Error reprocessing file {file_ref.minio_file_name}: {str(e)}"
            )


@shared_task
def process_file_task(file_id):
    import magic

    # Get the file reference
    file_ref = FileReference.objects.get(id=file_id)

    # Get the file from MinIO
    minio_client = MinioClient()

    # Fetch the file size if it is not set
    if file_ref.file_size is None:
        file_size = minio_client.fetch_file_size(
            file_ref.bucket_name, file_ref.minio_file_name
        )

        if file_size is None:
            logger.error(
                f"Failed to fetch file size for {file_ref.minio_file_name} in bucket {file_ref.bucket_name}"
            )

        file_ref.file_size = file_size
        file_ref.save(update_fields=["file_size"])

    # Fetch the mimetype if it is not set
    if file_ref.mimetype is None:
        header_bytes = minio_client.read_bytes(
            file_ref.bucket_name, file_ref.minio_file_name, offset=0, length=8192
        )

        if header_bytes is None:
            logger.error(
                f"Failed to fetch header bytes for {file_ref.minio_file_name} in bucket {file_ref.bucket_name}"
            )
            return

        mimetype = magic.from_buffer(header_bytes, mime=True)
        file_ref.mimetype = mimetype
        file_ref.save(update_fields=["mimetype"])

    if (
        file_ref.file_size is not None
        and file_ref.file_size <= cradle_settings.files.max_file_size_for_hashing
    ):
        file_obj = minio_client.fetch_file(
            file_ref.bucket_name, file_ref.minio_file_name
        )

        if not file_obj:
            logger.error(
                f"File not found in MinIO: {file_ref.minio_file_name} in bucket {file_ref.bucket_name}"
            )
            return

        if file_ref.md5_hash and file_ref.sha1_hash and file_ref.sha256_hash:
            return

        try:
            # Initialize hash objects
            md5_hash = hashlib.md5()
            sha1_hash = hashlib.sha1()
            sha256_hash = hashlib.sha256()

            # Read and update hash in chunks
            chunk_size = 8192  # 8KB chunks

            while True:
                data = file_obj.read(chunk_size)

                if not data:
                    break

                md5_hash.update(data)
                sha1_hash.update(data)
                sha256_hash.update(data)

            # Store the hexadecimal digest of the hashes
            file_ref.md5_hash = md5_hash.hexdigest()
            file_ref.sha1_hash = sha1_hash.hexdigest()
            file_ref.sha256_hash = sha256_hash.hexdigest()

            # Save all updated fields
            file_ref.save(update_fields=["md5_hash", "sha1_hash", "sha256_hash"])
        except Exception as e:
            logger.error(f"Error processing file {file_ref.minio_file_name}: {str(e)}")
        finally:
            # Always close the file object
            file_obj.close()

    from notes.tasks import link_files_task

    transaction.on_commit(lambda: link_files_task.apply_async(args=(file_ref.note.id,)))


@shared_task
def delete_hanging_files():
    client = MinioClient()

    for user in CradleUser.objects.all():
        bucket_name = str(user.id)

        filenames = set(client.list_objects(bucket_name))

        referenced_files = set(
            FileReference.objects.filter(bucket_name=bucket_name).values_list(
                "minio_file_name", flat=True
            )
        )

        unreferenced_files = set(filenames) - referenced_files

        client.delete_files(bucket_name, unreferenced_files)
