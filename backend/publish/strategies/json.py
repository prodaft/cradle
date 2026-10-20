import json
import logging
from datetime import timedelta
from typing import List

from entries.serializers import EntryClassSerializer, EntryPublishSerializer
from notes.models import Note

from ..models import PublishedReport
from .base import BasePublishStrategy

logger = logging.getLogger(__name__)


class JSONPublish(BasePublishStrategy):
    """A publishing strategy that generates a JSON report from a list of notes."""

    content_type = "application/json"

    def create_report(self, report: PublishedReport) -> bool:
        """Build JSON report and upload to S3."""
        content = self._build_report(report.title, report.notes.all())
        return self._save_report_file(json.dumps(content).encode("utf-8"), f"{report.id}.json", report)

    def _build_report(self, title: str, notes: List[Note]) -> dict:
        """Build JSON report structure with notes, entries, and entry classes."""
        report = {
            "title": title,
            "notes": [],
            "entries": [],
            "entry_classes": [],
        }

        linked_entries_set = set()
        for note in notes:
            entries = note.entries
            files = note.files
            note = self._anonymize_note(note)

            note_data = {
                "content": note.content,
                "file_urls": {},
            }
            for entry in entries.all():
                linked_entries_set.add(self._anonymize_entry(entry))

            for file_ref in files.all():
                if not file_ref.file:
                    continue

                try:
                    note_data["file_urls"][file_ref.file.name] = file_ref.download_url(
                        expires_in=int(timedelta(days=7).total_seconds()), content_type="application/octet-stream"
                    )
                except Exception as e:
                    logger.debug("Failed to presign file %s: %s", file_ref.file.name, e)
                    continue

            report["notes"].append(note_data)

        entries_data = EntryPublishSerializer(linked_entries_set, many=True).data
        report["entries"] = entries_data

        linked_entry_classes = {entry.entry_class for entry in linked_entries_set}
        entry_classes_data = EntryClassSerializer(linked_entry_classes, many=True).data
        report["entry_classes"] = entry_classes_data

        return report
