import logging
import magic
import hashlib
from celery import shared_task

from file_transfer.models import FileReference
from file_transfer.utils import MinioClient
from management.settings import cradle_settings
from user.models import CradleUser
from django.db import transaction

logger = logging.getLogger("django.request")


@shared_task
def reprocess_all_files_task():
    pass


@shared_task
def process_file_task(file_id):
    # Get the file reference
    file_ref = FileReference.objects.get(id=file_id)

    # Get the file from MinIO
    minio_client = MinioClient()
    file_obj = minio_client.fetch_file(file_ref.bucket_name, file_ref.minio_file_name)

    if not file_obj:
        logger.error(
            f"File not found in MinIO: {file_ref.minio_file_name} in bucket {file_ref.bucket_name}"
        )
        return

    try:
        mimetype = None

        # Initialize hash objects
        md5_hash = hashlib.md5()
        sha1_hash = hashlib.sha1()
        sha256_hash = hashlib.sha256()

        # Read and update hash in chunks
        chunk_size = 8192  # 8KB chunks

        trapdoor = False

        while True:
            data = file_obj.read(chunk_size)

            if not data:
                break

            if mimetype is None:
                if not file_ref.mimetype:
                    mimetype = magic.from_buffer(data, mime=True)
                    file_ref.mimetype = mimetype

                if file_ref.mimetype not in cradle_settings.files.mimetype_patterns:
                    if mimetype:
                        file_ref.save(update_fields=["mimetype"])
                    break

            if file_ref.md5_hash and file_ref.sha1_hash and file_ref.sha256_hash:
                break

            trapdoor = True

            md5_hash.update(data)
            sha1_hash.update(data)
            sha256_hash.update(data)

        if not trapdoor:
            return

        # Store the hexadecimal digest of the hashes
        file_ref.md5_hash = md5_hash.hexdigest()
        file_ref.sha1_hash = sha1_hash.hexdigest()
        file_ref.sha256_hash = sha256_hash.hexdigest()

        # Save all updated fields
        file_ref.save(
            update_fields=["mimetype", "md5_hash", "sha1_hash", "sha256_hash"]
        )

        from notes.tasks import link_files_task

        transaction.on_commit(
            lambda: link_files_task.apply_async(args=(file_ref.note.id))
        )

    except Exception as e:
        logger.error(f"Error processing file {file_ref.minio_file_name}: {str(e)}")
    finally:
        # Always close the file object
        file_obj.close()


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
