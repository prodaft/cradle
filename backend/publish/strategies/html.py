import uuid
from io import BytesIO
from datetime import timedelta
from typing import List

import mistune

from notes.models import Note
from user.models import CradleUser
from file_transfer.utils import MinioClient
from .base import BasePublishStrategy, PublishResult


class HTMLPublish(BasePublishStrategy):
    """
    Example HTML strategy storing HTML files in MinIO.
    """

    def generate_access_link(self, report_location: str, user: CradleUser) -> str:
        """
        Generate a new presigned link to the existing file in MinIO.
        `report_location` in HTML strategy typically is the file name in MinIO.
        """
        bucket_name = str(user.id) if user else "default_bucket"
        client = MinioClient().client

        url = client.presigned_get_object(
            bucket_name,
            report_location,
            expires=timedelta(hours=1),
        )
        return url

    def edit_report(
        self, title: str, report_location: str, notes: List[Note], user: CradleUser
    ) -> PublishResult:
        """
        Overwrite/update the existing HTML file in MinIO with new content from `notes`.
        """
        bucket_name = str(user.id) if user else "default_bucket"
        client = MinioClient().client
        if client is None:
            return PublishResult(success=False, error="Minio client is not configured")

        markdown_renderer = mistune.create_markdown(renderer=mistune.HTMLRenderer())
        html_body = ""
        for note in notes:
            rendered_note = markdown_renderer(note.content)
            html_body += f"<div class='note'>{rendered_note}</div>\n"

        full_html = (
            f"<!DOCTYPE html>"
            f"<html><head><meta charset='utf-8'><title>{title}</title></head>"
            f"<body><h1>Updated</h1>{html_body}</body></html>"
        )

        data = BytesIO(full_html.encode("utf-8"))
        size = len(full_html)
        content_type = "text/html"

        # Overwrite the existing object
        try:
            client.put_object(
                bucket_name, report_location, data, size, content_type=content_type
            )
        except Exception as e:
            return PublishResult(success=False, error=f"Failed to update HTML: {e}")

        return PublishResult(success=True, data=report_location)

    def create_report(
        self, title: str, notes: List[Note], user: CradleUser
    ) -> PublishResult:
        """
        Create a brand-new HTML file in MinIO from the given notes.
        (Old 'publish' method.)
        """
        markdown_renderer = mistune.create_markdown(renderer=mistune.HTMLRenderer())

        html_body = ""
        for note in notes:
            rendered_note = markdown_renderer(note.content)
            html_body += f"<div class='note'>{rendered_note}</div>\n"

        full_html = (
            f"<!DOCTYPE html>"
            f"<html><head><meta charset='utf-8'><title>{title}</title></head>"
            f"<body><h1>{title}</h1>{html_body}</body></html>"
        )

        file_name = f"{uuid.uuid4()}.html"
        bucket_name = str(user.id) if user else "default_bucket"

        client = MinioClient().client
        if client is None:
            return PublishResult(success=False, error="Minio client is not configured")

        data = BytesIO(full_html.encode("utf-8"))
        size = len(full_html)
        content_type = "text/html"

        try:
            client.put_object(
                bucket_name, file_name, data, size, content_type=content_type
            )
        except Exception as e:
            return PublishResult(
                success=False, error=f"Failed to upload HTML report: {e}"
            )

        # We can return just the file_name as the `report_location` so that
        # we can generate presigned links later.
        return PublishResult(success=True, data=file_name)

    def delete_report(self, report_location: str, user: CradleUser) -> PublishResult:
        """
        Remove the HTML file from MinIO.
        """
        bucket_name = str(user.id) if user else "default_bucket"
        client = MinioClient().client
        try:
            client.remove_object(bucket_name, report_location)
        except Exception as e:
            return PublishResult(success=False, error=f"Failed to delete HTML: {e}")

        return PublishResult(success=True, data=f"Deleted {report_location}")
