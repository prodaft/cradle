import logging
import bleach
from io import BytesIO
from typing import List

from django.template.loader import get_template

from file_transfer.models import FileReference
from notes.models import Note
from notes.markdown.to_html import markdown_to_html
from entries.models import EntryClass
from publish.models import PublishedReport, ReportStatus
from file_transfer.utils import MinioClient
from .base import BasePublishStrategy


class HTMLPublish(BasePublishStrategy):
    """
    HTML publishing strategy that renders a report using a Django template
    and sanitizes user content to prevent harmful HTML from being introduced.
    """

    content_type = "text/html"

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
            "span": ["class", "data-id", "entry-type", "data-key", "data-value"],
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
                    f'[entry-type="{k}"] {{ background-color: {v}44; }}'
                    for k, v in colors.items()
                ]
            ),
        }
        return template.render(context)

    def create_report(self, report: PublishedReport) -> bool:
        full_html = self._build_html(report.title, report.notes.all(), user=report.user)
        bucket_name = str(report.user.id)
        file_name = f"{report.id}.html"

        client = MinioClient().client
        if client is None:
            report.error_message = "Minio client is not configured."
            report.status = ReportStatus.ERROR
            report.save()
            return False

        data = BytesIO(full_html.encode("utf-8"))
        size = len(full_html.encode("utf-8"))
        content_type = "text/html"

        try:
            client.put_object(
                bucket_name, file_name, data, size, content_type=content_type
            )
            FileReference.objects.filter(report=report).delete()
            FileReference.objects.create(
                minio_file_name=file_name,
                file_name=file_name,
                bucket_name=bucket_name,
                report=report,
            )
        except Exception as e:
            logging.exception(e)
            report.error_message = "Failed to upload HTML report."
            report.status = ReportStatus.ERROR
            report.save()
            return False

        return True

    def edit_report(self, report: PublishedReport) -> bool:
        bucket_name = str(report.user.id)
        client = MinioClient().client
        if client is None:
            report.error_message = "Minio client is not configured."
            report.status = ReportStatus.ERROR
            report.save()
            return False

        full_html = self._build_html(report.title, report.notes.all(), user=report.user)
        data = BytesIO(full_html.encode("utf-8"))
        size = len(full_html.encode("utf-8"))
        content_type = "text/html"

        try:
            client.put_object(
                bucket_name, report.id, data, size, content_type=content_type
            )
        except Exception:
            report.error_message = "Failed to upload HTML report."
            report.status = ReportStatus.ERROR
            report.save()
            return False

        return True

    def delete_report(self, report: PublishedReport) -> bool:
        client = MinioClient().client
        try:
            client.remove_object(str(report.user.id), f"{report.id}.html")
        except Exception:
            report.error_message = "Failed to delete HTML report."
            report.status = ReportStatus.ERROR
            report.save()
            return False

        return True
