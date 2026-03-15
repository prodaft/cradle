import logging
from typing import List

import bleach
from django.core.files.base import ContentFile
from django.template.loader import get_template

from entries.models import EntryClass
from file_transfer.s3_utils import fetch_bytes
from file_transfer.storage import FileTransferStorage
from notes.markdown.to_html import markdown_to_html
from notes.models import Note

from ..models import PublishedReport, ReportStatus
from .base import BasePublishStrategy

logger = logging.getLogger(__name__)


class HTMLPublish(BasePublishStrategy):
    """HTML publishing strategy using Django templates.

    Sanitizes user content to prevent XSS.
    """

    content_type = "text/html"

    def _sanitize_html(self, html: str) -> str:
        """Sanitize HTML to prevent XSS; allow only safe tags and attributes."""
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

    def _build_html(self, title: str, notes: List[Note]) -> str:
        """Render notes as HTML using the report template."""
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
            "styles": "\n".join([f'[entry-type="{k}"] {{ background-color: {v}44; }}' for k, v in colors.items()]),
        }
        return template.render(context)

    def _upload_html(self, html: str, report: PublishedReport) -> bool:
        """Save HTML to S3 via report.file; returns False on failure."""
        try:
            if report.file:
                report.file.delete(save=False)
            report.file.save(f"{report.id}.html", ContentFile(html.encode("utf-8")), save=True)
        except Exception as e:
            logger.exception("Failed to upload HTML report.")
            report.error_message = f"Failed to upload HTML report: {e}"
            report.status = ReportStatus.ERROR
            report.save()
            return False
        return True

    def create_report(self, report: PublishedReport) -> bool:
        full_html = self._build_html(report.title, report.notes.all())
        return self._upload_html(full_html, report)

    def edit_report(self, report: PublishedReport) -> bool:
        full_html = self._build_html(report.title, report.notes.all())
        return self._upload_html(full_html, report)

    def delete_report(self, report: PublishedReport) -> bool:
        try:
            # Delete file from S3 via FileField
            if report.file:
                report.file.delete(save=False)
        except Exception:
            logger.exception("Failed to delete HTML report.")
            report.error_message = "Failed to delete HTML report."
            report.status = ReportStatus.ERROR
            report.save()
            return False

        return True
