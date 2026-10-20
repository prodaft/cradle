import logging
from typing import Dict

from django.core.files.base import ContentFile

from entries.models import Entry, EntryClass
from notes.markdown.to_markdown import Anonymizer, anonymize_markdown
from notes.models import Note

from ..models import PublishedReport

logger = logging.getLogger(__name__)


class BasePublishStrategy:
    """Base interface for a publishing strategy."""

    def __init__(self, anonymize: bool):
        """Initialize with anonymization flag for report content."""
        self.anonymize = anonymize
        self.anonymizer = Anonymizer()
        self._eclasses = None

    @property
    def eclasses(self) -> Dict[str, EntryClass]:
        """Entry classes keyed by subtype, lazily loaded."""
        if self._eclasses is None:
            eclasses = list(EntryClass.objects.all())
            self._eclasses = {eclass.subtype: eclass for eclass in eclasses}

        return self._eclasses

    def _anonymize_note(self, note: Note) -> Note:
        """Anonymize a note."""
        if not self.anonymize:
            return note

        content = anonymize_markdown(note.content, self.eclasses, self.anonymizer)

        return Note(
            content=content,
            author=note.author,
            editor=note.editor,
            timestamp=note.timestamp,
            edit_timestamp=note.edit_timestamp,
        )

    def _anonymize_entry(self, entry: Entry) -> Entry:
        """Anonymize an entry."""
        if not self.anonymize:
            return entry

        eclass = entry.entry_class
        return Entry(
            id=entry.id,
            name=self.anonymizer.anonymize(eclass, entry.name),
            entry_class=entry.entry_class,
        )

    def create_report(self, report: PublishedReport) -> bool:
        """Create a brand new report/publication from scratch."""
        raise NotImplementedError()

    def delete_report(self, report: PublishedReport) -> bool:
        """Delete the report file from S3. Returns False (and marks the report as failed) on error."""
        try:
            if report.file:
                report.file.delete(save=False)
        except Exception:
            logger.exception("Failed to delete published report %s.", report.id)
            report.mark_error("The published report file could not be removed.")
            return False
        return True

    def _save_report_file(self, content: bytes, filename: str, report: PublishedReport) -> bool:
        """Upload report bytes to S3 and record the file on the report. Returns False on failure.

        Only the ``file`` column is written, so a report deleted during generation is not re-created;
        the just-uploaded file is removed instead.
        """
        try:
            if report.file:
                report.file.delete(save=False)
            report.file.save(filename, ContentFile(content), save=False)
        except Exception:
            logger.exception("Failed to upload %s report %s.", report.strategy, report.id)
            report.mark_error("The report could not be saved. Please try again.")
            return False

        if not report.save_fields("file"):
            report.file.delete(save=False)
            return False
        return True
