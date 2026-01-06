import logging
import bleach
from typing import List
from io import BytesIO

from django.core.files.base import ContentFile
from django.template.loader import get_template

from file_transfer.storage import FileTransferStorage
from notes.models import Note
from notes.markdown.to_html import markdown_to_html
from entries.models import EntryClass
from publish.models import PublishedReport, ReportStatus
from .base import BasePublishStrategy
from file_transfer.s3_utils import fetch_bytes


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
                if not f.file:
                    continue
                # Backward-compatible: footnote keys in markdown may still reference
                # legacy minio_file_name, but the object now lives under f.file.name
                if f.minio_file_name:
                    footnotes[f.minio_file_name] = (
                        FileTransferStorage.bucket_name,
                        f.file.name,
                    )
                footnotes[f.file.name] = (FileTransferStorage.bucket_name, f.file.name)

        for note in notes:
            anonymized_note = self._anonymize_note(note)
            rendered_note = markdown_to_html(
                anonymized_note.content,
                fetch_image=lambda bucket, key: fetch_bytes(bucket, key),
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

        try:
            # Save HTML content to FileField - Django handles S3 upload
            report.file.save(
                f"{report.id}.html",
                ContentFile(full_html.encode("utf-8")),
                save=True
            )
        except Exception as e:
            logging.exception(e)
            report.error_message = "Failed to upload HTML report."
            report.status = ReportStatus.ERROR
            report.save()
            return False

        return True

    def edit_report(self, report: PublishedReport) -> bool:
        full_html = self._build_html(report.title, report.notes.all(), user=report.user)

        try:
            # Delete old file if exists
            if report.file:
                report.file.delete(save=False)

            # Save new HTML content to FileField
            report.file.save(
                f"{report.id}.html",
                ContentFile(full_html.encode("utf-8")),
                save=True
            )
        except Exception:
            report.error_message = "Failed to upload HTML report."
            report.status = ReportStatus.ERROR
            report.save()
            return False

        return True

    def delete_report(self, report: PublishedReport) -> bool:
        try:
            # Delete file from S3 via FileField
            if report.file:
                report.file.delete(save=False)
        except Exception:
            report.error_message = "Failed to delete HTML report."
            report.status = ReportStatus.ERROR
            report.save()
            return False

        return True
