import uuid
import bleach
from io import BytesIO
from datetime import timedelta
from typing import List

from django.template.loader import get_template

from notes.models import Note
from notes.markdown.to_html import markdown_to_html
from entries.models import EntryClass
from user.models import CradleUser
from file_transfer.utils import MinioClient
from .base import BasePublishStrategy, PublishResult


class HTMLPublish(BasePublishStrategy):
    """
    HTML publishing strategy that renders a report using a Django template
    and sanitizes user content to prevent harmful HTML from being introduced.
    """

    def _get_bucket_name(self, user: CradleUser) -> str:
        return str(user.id) if user else "default_bucket"

    def _sanitize_html(self, html: str) -> str:
        allowed_tags = [
            "a",
            "abbr",
            "acronym",
            "b",
            "blockquote",
            "code",
            "em",
            "i",
            "li",
            "ol",
            "strong",
            "ul",
            "p",
            "div",
            "span",
            "br",
            "img",
            "pre",
        ]
        allowed_attrs = {
            "a": ["href", "title"],
            "img": ["src", "alt", "title"],
            "span": ["class", "data-id", "data-type", "data-key", "data-value"],
        }
        allowed_protocols = {"data", "http", "https"}
        return bleach.clean(
            html,
            tags=allowed_tags,
            attributes=allowed_attrs,
            protocols=allowed_protocols,
            strip=True,
        )

    def _build_html(self, title: str, notes: List[Note], user) -> str:
        body = ""

        footnotes = {}
        for note in notes:
            for f in note.files.all():
                footnotes[f.minio_file_name] = (f.bucket_name, f.minio_file_name)

        for note in notes:
            anonymized_note = self._anonymize_note(note)
            rendered_note = markdown_to_html(
                anonymized_note.content,
                fetch_image=MinioClient().fetch_file,
                footnotes=footnotes,
            )
            sanitized_note = self._sanitize_html(rendered_note)
            body += f"<div class='note'>{sanitized_note}</div>\n"

        sanitized_title = self._sanitize_html(title)

        colors = {}

        for i in EntryClass.objects.all():
            colors[i.subtype] = i.color

        template = get_template("report/simple.html")
        context = {
            "title": sanitized_title,
            "body": body,
            "styles": "\n".join(
                [
                    f'.entry[data-type="{k}"] {{ background-color: "{v}"; }}'
                    for k, v in colors.items()
                ]
            ),
        }
        return template.render(context)

    def generate_access_link(self, report_location: str, user: CradleUser) -> str:
        bucket_name = self._get_bucket_name(user)
        client = MinioClient().client
        url = client.presigned_get_object(
            bucket_name,
            report_location,
            expires=timedelta(hours=1),
        )
        return url

    def create_report(
        self, title: str, notes: List[Note], user: CradleUser
    ) -> PublishResult:
        full_html = self._build_html(title, notes, user=user)
        file_name = f"{uuid.uuid4()}.html"
        bucket_name = self._get_bucket_name(user)

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

        return PublishResult(success=True, data=file_name)

    def edit_report(
        self, title: str, report_location: str, notes: List[Note], user: CradleUser
    ) -> PublishResult:
        bucket_name = self._get_bucket_name(user)
        client = MinioClient().client
        if client is None:
            return PublishResult(success=False, error="Minio client is not configured")

        full_html = self._build_html(title, notes, user=user)
        data = BytesIO(full_html.encode("utf-8"))
        size = len(full_html)
        content_type = "text/html"

        try:
            client.put_object(
                bucket_name, report_location, data, size, content_type=content_type
            )
        except Exception as e:
            return PublishResult(success=False, error=f"Failed to update HTML: {e}")

        return PublishResult(success=True, data=report_location)

    def delete_report(self, report_location: str, user: CradleUser) -> PublishResult:
        bucket_name = self._get_bucket_name(user)
        client = MinioClient().client
        try:
            client.remove_object(bucket_name, report_location)
        except Exception as e:
            return PublishResult(success=False, error=f"Failed to delete HTML: {e}")

        return PublishResult(success=True, data=f"Deleted {report_location}")
