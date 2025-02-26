import uuid
from io import BytesIO
from datetime import timedelta
from typing import List, Optional

import mistune

from notes.models import Note
from user.models import CradleUser
from .base import BasePublishStrategy, PublishResult
from file_transfer.utils import MinioClient


class HTMLPublish(BasePublishStrategy):
    def publish(self, title: str, notes: List[Note], user: CradleUser) -> PublishResult:
        # Create a Markdown-to-HTML renderer using mistune's HTMLRenderer.
        markdown = mistune.create_markdown(renderer=mistune.HTMLRenderer())

        # Render each note's content from Markdown to HTML.
        html_body = ""
        for note in notes:
            rendered_note = markdown(note.content)
            html_body += f"<div class='note'>{rendered_note}</div>\n"

        # Build the complete HTML document.
        full_html = (
            f"<!DOCTYPE html>"
            f"<html><head><meta charset='utf-8'><title>{title}</title></head>"
            f"<body><h1>{title}</h1>{html_body}</body></html>"
        )

        # Generate a unique filename for the HTML report.
        file_name = f"{uuid.uuid4()}.html"
        bucket_name = str(user.id) if user else "default_bucket"

        # Upload the HTML content to MinIO.
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

        # Generate a presigned URL for the uploaded HTML report.
        try:
            url = client.presigned_get_object(
                bucket_name, file_name, expires=timedelta(hours=1)
            )
        except Exception as e:
            return PublishResult(
                success=False, error=f"Failed to generate presigned URL: {e}"
            )

        return PublishResult(success=True, data=url)
