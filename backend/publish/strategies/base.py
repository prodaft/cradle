from typing import Dict, List, Optional
from entries.models import Entry, EntryClass
from notes.markdown.to_markdown import Anonymizer, anonymize_markdown
from notes.models import Note
from user.models import CradleUser


class PublishResult:
    def __init__(
        self, success: bool, data: Optional[str] = None, error: Optional[str] = None
    ):
        self.success = success
        self.data = data
        self.error = error

    def __bool__(self):
        return self.success


class BasePublishStrategy:
    """
    Base interface for a publishing strategy.
    """

    def __init__(self, anonymize: bool):
        self.anonymize = anonymize
        self.anonymizer = Anonymizer()
        self._eclasses = None

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

    def generate_access_link(self, report_location: str, user: CradleUser) -> str:
        """
        Generate an access link to an existing published resource.
        """
        raise NotImplementedError()

    def edit_report(
        self, title: str, report_location: str, notes: List[Note], user: CradleUser
    ) -> PublishResult:
        """
        Edit an existing published resource (given its location).
        """
        raise NotImplementedError()

    def create_report(
        self, title: str, notes: List[Note], user: CradleUser
    ) -> PublishResult:
        """
        Create a brand new report/publication from scratch.
        """
        raise NotImplementedError()

    def delete_report(self, report_location: str, user: CradleUser) -> PublishResult:
        """
        Delete an existing published resource (given its location).
        """
        raise NotImplementedError()
