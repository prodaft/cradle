"""Exceptions and error codes for the notes app."""

from typing import Iterable, Protocol

from rest_framework import status

from core.exceptions import CradleAPIException, ErrorCode
from entries.models import Entry
from management.settings import cradle_settings


class _LinkLike(Protocol):
    """Protocol for link-like objects with key and value (e.g. from markdown parser)."""

    key: str
    value: str


class NotesErrorCodes(ErrorCode):
    """Error codes for notes operations."""

    NOTE_IS_EMPTY = (
        status.HTTP_400_BAD_REQUEST,
        "Note Is Empty",
        "note-is-empty",
    )
    MAX_LENGTH_EXCEEDED = (
        status.HTTP_400_BAD_REQUEST,
        "Max Length Exceeded",
        "max-length-exceeded",
    )
    NOT_ENOUGH_REFERENCES = (
        status.HTTP_400_BAD_REQUEST,
        "Not Enough References",
        "not-enough-references",
    )
    INVALID_DATE_FORMAT = (
        status.HTTP_400_BAD_REQUEST,
        "Invalid Date Format",
        "invalid-date-format",
    )
    NOTE_NOT_FOUND = (
        status.HTTP_404_NOT_FOUND,
        "Note Not Found",
        "note-not-found",
    )
    ENTRY_TYPES_NOT_FOUND = (
        status.HTTP_404_NOT_FOUND,
        "Entry Types Not Found",
        "entry-types-not-found",
    )
    ENTRIES_NOT_FOUND = (
        status.HTTP_404_NOT_FOUND,
        "Entries Not Found",
        "entries-not-found",
    )
    # Same title as ENTRIES_NOT_FOUND by design (indistinguishable 404); API ``code`` still differs.
    NO_ACCESS_TO_ENTRIES = (
        status.HTTP_404_NOT_FOUND,
        "Entries Not Found",
        "no-access-to-entries",
    )
    INVALID_REFERENCE_COUNT = (
        status.HTTP_400_BAD_REQUEST,
        "Invalid Reference Count",
        "invalid-reference-count",
    )
    CANNOT_EDIT_NOTE = (
        status.HTTP_403_FORBIDDEN,
        "Cannot Edit Note",
        "cannot-edit-note",
    )
    SNIPPET_NOT_FOUND = (
        status.HTTP_404_NOT_FOUND,
        "Snippet Not Found",
        "snippet-not-found",
    )


class NoteIsEmptyException(CradleAPIException):
    """Exception raised when a note is empty."""

    error_code = NotesErrorCodes.NOTE_IS_EMPTY

    def __init__(self, detail=None, error_code=None, code=None):
        if detail is None:
            detail = "Add a title or content before saving the note."
        super().__init__(detail=detail, error_code=error_code, code=code)


class MaxLengthExceededException(CradleAPIException):
    """Exception raised when a field exceeds maximum length."""

    error_code = NotesErrorCodes.MAX_LENGTH_EXCEEDED

    def __init__(self, field: str, max_length: int, *args, **kwargs) -> None:
        detail = f'"{field}" cannot be longer than {max_length} characters.'
        super().__init__(detail=detail, *args, **kwargs)


class NotEnoughReferencesException(CradleAPIException):
    """Exception raised when a note doesn't have enough entity/entry references."""

    error_code = NotesErrorCodes.NOT_ENOUGH_REFERENCES

    def __init__(self, *args, **kwargs) -> None:
        min_entities = cradle_settings.notes.min_entities
        min_entries = cradle_settings.notes.min_entries
        entity_word = "entity" if min_entities == 1 else "entities"
        entry_word = "entry" if min_entries == 1 else "entries"
        detail = f"A note must reference at least {min_entities} {entity_word} and {min_entries} {entry_word}."
        super().__init__(detail=detail, *args, **kwargs)


class InvalidDateFormatException(CradleAPIException):
    """Exception raised when date format is invalid."""

    error_code = NotesErrorCodes.INVALID_DATE_FORMAT

    def __init__(self, _invalid_value: str, *args, **kwargs) -> None:
        detail = "Enter a date as DD-MM-YYYY, or a date and time as HH:mm DD-MM-YYYY."
        super().__init__(detail=detail, *args, **kwargs)


class NoteNotFoundException(CradleAPIException):
    """Exception raised when a note does not exist or user lacks access."""

    error_code = NotesErrorCodes.NOTE_NOT_FOUND


class EntryTypesNotFoundException(CradleAPIException):
    """Exception raised when referenced entry types don't exist."""

    error_code = NotesErrorCodes.ENTRY_TYPES_NOT_FOUND

    def __init__(self, subtypes: Iterable[str], *args, **kwargs) -> None:
        assert len(subtypes) > 0
        labels = [(str(s).replace("_", " ").strip() or str(s)) for s in subtypes]
        detail = "The following entry types could not be found: " + ", ".join(labels) + "."
        super().__init__(detail=detail, *args, **kwargs)


class EntriesNotFoundException(CradleAPIException):
    """Exception raised when referenced entries don't exist or user lacks permission."""

    error_code = NotesErrorCodes.ENTRIES_NOT_FOUND

    def __init__(self, links: Iterable[_LinkLike], *args, **kwargs) -> None:
        assert len(links) > 0
        super().__init__(detail="Some of the linked entries could not be found.", *args, **kwargs)


class NoAccessToEntriesException(CradleAPIException):
    """Exception raised when user doesn't have access to entries (404 to avoid revealing)."""

    error_code = NotesErrorCodes.NO_ACCESS_TO_ENTRIES

    def __init__(self, entries: Iterable[Entry], *args, **kwargs) -> None:
        assert len(entries) > 0
        super().__init__(detail="Some of the linked entries could not be found.", *args, **kwargs)


class InvalidReferenceCountException(CradleAPIException):
    """Exception raised when references_at_least parameter is invalid."""

    error_code = NotesErrorCodes.INVALID_REFERENCE_COUNT

    def __init__(self, detail=None, error_code=None, code=None):
        if detail is None:
            detail = "Enter a whole number from 1 through the number of entries you listed."
        super().__init__(detail=detail, error_code=error_code, code=code)


class CannotEditNoteException(CradleAPIException):
    """Exception raised when user cannot edit a note."""

    error_code = NotesErrorCodes.CANNOT_EDIT_NOTE


class SnippetNotFoundException(CradleAPIException):
    """Exception raised when a snippet is not found."""

    error_code = NotesErrorCodes.SNIPPET_NOT_FOUND
