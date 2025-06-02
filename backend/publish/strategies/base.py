from typing import Dict
from entries.models import Entry, EntryClass
from notes.markdown.to_markdown import Anonymizer, anonymize_markdown
from notes.models import Note
from ..models import PublishedReport


class BasePublishStrategy:
    """
    Base interface for a publishing strategy.
    """

    def __init__(self, anonymize: bool):
        self.anonymize = anonymize
        self.anonymizer = Anonymizer()
        self._eclasses = None

    def get_remote_url(self, report: PublishedReport) -> str:
        """
        Get the remote URL of the published report.
        """
        if not report.external_ref:
            raise ValueError("Report does not have an external reference.")
        return report.external_ref

    @property
    def eclasses(self) -> Dict[str, EntryClass]:
        if self._eclasses is None:
            eclasses = list(EntryClass.objects.all())
            self._eclasses = {eclass.subtype: eclass for eclass in eclasses}

        return self._eclasses

    def _anonymize_note(self, note: Note) -> Note:
        """
        Anonymize a note.
        """
        if not self.anonymize:
            return note

        content = anonymize_markdown(note.content, self.eclasses, self.anonymizer)

        return Note(
            content=content,
            author=note.author,
            editor=note.editor,
            timestamp=note.timestamp,
            edit_timestamp=note.edit_timestamp,
            publishable=note.publishable,
        )

    def _anonymize_entry(self, entry: Entry) -> Entry:
        """
        Anonymize an entry.
        """
        if not self.anonymize:
            return entry

        eclass = entry.entry_class
        return Entry(
            id=entry.id,
            name=self.anonymizer.anonymize(eclass, entry.name),
            entry_class=entry.entry_class,
        )

    def edit_report(self, report: PublishedReport) -> bool:
        """
        Edit an existing published resource
        """
        raise NotImplementedError()

    def create_report(self, report: PublishedReport) -> bool:
        """
        Create a brand new report/publication from scratch.
        """
        raise NotImplementedError()

    def delete_report(self, report: PublishedReport) -> bool:
        """
        Delete an existing published resource (given its location).
        """
        raise NotImplementedError()
