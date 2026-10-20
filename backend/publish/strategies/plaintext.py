from typing import List

from notes.models import Note

from ..models import PublishedReport
from .base import BasePublishStrategy


class PlaintextPublish(BasePublishStrategy):
    """A publishing strategy that generates a plaintext report from a list of notes."""

    content_type = "text/plain"

    def create_report(self, report: PublishedReport) -> bool:
        """Build plaintext report and upload to S3."""
        text_content = self._build_text(report.title, report.notes.all())
        return self._save_report_file(text_content.encode("utf-8"), f"{report.id}.txt", report)

    def _build_text(self, title: str, notes: List[Note]) -> str:
        """Concatenate note contents with separators."""
        contents = []
        for note in notes:
            anonymized_note = self._anonymize_note(note)
            contents.append(anonymized_note.content)
        separator = "\n-----\n"
        notes_text = separator.join(contents)
        return f"{title}\n\n{notes_text}"
