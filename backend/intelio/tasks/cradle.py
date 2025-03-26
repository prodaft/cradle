from celery import shared_task

from intelio.models.base import BaseDigest


@shared_task
def download_file_for_note(note_id, file_identifier, file_url, bucket_name):
    """
    Downloads a file from the given URL, stores it in Minio, and attaches
    the resulting FileReference to the Note with the provided note_id.
    """
    try:
        note = Note.objects.get(id=note_id)
    except Note.DoesNotExist:
        logger.error("Note with id %s does not exist.", note_id)
        return

    try:
        client = MinioClient().client
        r = requests.get(file_url, timeout=10)
        r.raise_for_status()  # Raise an HTTPError for bad responses

        file_data = r.content
        data_stream = BytesIO(file_data)
        size = len(file_data)
        content_type = r.headers.get("Content-Type", "application/octet-stream")

        client.put_object(
            bucket_name,
            file_identifier,
            data_stream,
            size,
            content_type=content_type,
        )
        fr = FileReference.objects.create(
            minio_file_name=file_identifier,
            file_name=file_identifier,
            bucket_name=bucket_name,
        )
        note.files.add(fr)
        note.save()
    except Exception as e:
        logger.exception(
            "Failed to download or process file for note (id: %s). URL: %s Error: %s",
            note_id,
            file_url,
            e,
        )
        # Optionally, notify the user or perform retries here.
