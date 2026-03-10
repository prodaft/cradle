import logging
from typing import List

from django.core.files.base import ContentFile

from notes.models import Note

from ..models import PublishedReport, ReportStatus
from .base import BasePublishStrategy

logger = logging.getLogger(__name__)


class PlaintextPublish(BasePublishStrategy):
    """A publishing strategy that generates a plaintext report from a list of notes."""

    content_type = "text/plain"

    def create_report(self, report: PublishedReport) -> bool:
        """Build plaintext report and upload to S3."""
        text_content = self._build_text(report.title, report.notes.all())
        return self._upload_text(text_content, report)

    def edit_report(self, report: PublishedReport) -> bool:
        """Rebuild plaintext report and re-upload to S3."""
        text_content = self._build_text(report.title, report.notes.all())
        return self._upload_text(text_content, report)

    def delete_report(self, report: PublishedReport) -> bool:
        """Delete the plaintext report file from S3."""
        try:
            # Delete file from S3 via FileField
            if report.file:
                report.file.delete(save=False)
        except Exception:
            logger.exception("Failed to delete plaintext report.")
            report.error_message = "Failed to delete plaintext report."
            report.status = ReportStatus.ERROR
            report.save()
            return False

        return True

    def _build_text(self, title: str, notes: List[Note]) -> str:
        """Concatenate note contents with separators."""
        contents = []
        for note in notes:
            anonymized_note = self._anonymize_note(note)
            contents.append(anonymized_note.content)
        separator = "\n-----\n"
        notes_text = separator.join(contents)
        return f"{title}\n\n{notes_text}"

    def _upload_text(self, text: str, report: PublishedReport) -> bool:
        """Save plaintext to S3 via report.file; returns False on failure."""
        try:
            # Delete old file if exists
            if report.file:
                report.file.delete(save=False)

            # Save plaintext content to FileField - Django handles S3 upload
            report.file.save(f"{report.id}.txt", ContentFile(text.encode("utf-8")), save=True)
        except Exception:
            logger.exception("Failed to upload plaintext report.")
            report.error_message = "Failed to upload plaintext report."
            report.status = ReportStatus.ERROR
            report.save()
            return False

        return True
