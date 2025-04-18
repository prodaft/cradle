from celery import shared_task

from file_transfer.models import FileReference
from file_transfer.utils import MinioClient
from user.models import CradleUser


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
