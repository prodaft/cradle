from typing import List

from django.core.files.base import ContentFile

from notes.models import Note
from publish.models import PublishedReport, ReportStatus
from publish.strategies.base import BasePublishStrategy


class PlaintextPublish(BasePublishStrategy):
    """
    A publishing strategy that generates a plaintext report from a list of notes.
    """

    content_type = "text/plain"

    def create_report(self, report: PublishedReport) -> bool:
        text_content = self._build_text(report.title, report.notes.all())
        return self._upload_text(text_content, report)

    def edit_report(self, report: PublishedReport) -> bool:
        text_content = self._build_text(report.title, report.notes.all())
        return self._upload_text(text_content, report)

    def delete_report(self, report: PublishedReport) -> bool:
        try:
            # Delete file from S3 via FileField
            if report.file:
                report.file.delete(save=False)
        except Exception:
            report.error_message = "Failed to delete plaintext report."
            report.status = ReportStatus.ERROR
            report.save()
            return False

        return True

    def _build_text(self, title: str, notes: List[Note]) -> str:
        contents = []
        for note in notes:
            anonymized_note = self._anonymize_note(note)
            contents.append(anonymized_note.content)
        separator = "\n-----\n"
        notes_text = separator.join(contents)
        return f"{title}\n\n{notes_text}"

    def _upload_text(self, text: str, report: PublishedReport) -> bool:
        try:
            # Delete old file if exists
            if report.file:
                report.file.delete(save=False)

            # Save plaintext content to FileField - Django handles S3 upload
            report.file.save(
                f"{report.id}.txt",
                ContentFile(text.encode("utf-8")),
                save=True
            )
        except Exception:
            report.error_message = "Failed to upload plaintext report."
            report.status = ReportStatus.ERROR
            report.save()
            return False

        return True
