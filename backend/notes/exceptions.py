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

    NOTE_IS_EMPTY = (status.HTTP_400_BAD_REQUEST, "Note Is Empty", "note-is-empty")
    FIELD_TOO_LONG = (status.HTTP_400_BAD_REQUEST, "Field Too Long", "field-too-long")
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
    NOTE_DOES_NOT_EXIST = (
        status.HTTP_404_NOT_FOUND,
        "Note Not Found",
        "note-not-found",
    )
    ENTRY_CLASSES_DO_NOT_EXIST = (
        status.HTTP_404_NOT_FOUND,
        "Entry Classes Not Found",
        "entry-classes-not-found",
    )
    ENTRIES_DO_NOT_EXIST = (
        status.HTTP_404_NOT_FOUND,
        "Entries Not Found",
        "entries-not-found",
    )
    NO_ACCESS_TO_ENTRIES = (
        status.HTTP_404_NOT_FOUND,
        "Entries Not Found",
        "entries-not-found",
    )
    INVALID_REFERENCES_AT_LEAST = (
        status.HTTP_400_BAD_REQUEST,
        "Invalid References At Least",
        "invalid-references-at-least",
    )
    CANNOT_EDIT_NOTE = (
        status.HTTP_404_NOT_FOUND,
        "Note Not Found",
        "note-not-found",
    )
    SNIPPET_NOT_FOUND = (
        status.HTTP_404_NOT_FOUND,
        "Snippet Not Found",
        "snippet-not-found",
    )


class NoteIsEmptyException(CradleAPIException):
    """Exception raised when a note is empty."""

    error_code = NotesErrorCodes.NOTE_IS_EMPTY


class FieldTooLongException(CradleAPIException):
    """Exception raised when a field exceeds maximum length."""

    error_code = NotesErrorCodes.FIELD_TOO_LONG

    def __init__(self, field: str, max_length: int, *args, **kwargs) -> None:
        detail = f"The field '{field}' exceeds the maximum length of {max_length} characters."
        super().__init__(detail=detail, *args, **kwargs)


class NotEnoughReferencesException(CradleAPIException):
    """Exception raised when a note doesn't have enough entity/entry references."""

    error_code = NotesErrorCodes.NOT_ENOUGH_REFERENCES

    def __init__(self, *args, **kwargs) -> None:
        detail = (
            f"Note does not reference at least {cradle_settings.notes.min_entities} "
            + f"entity and at least {cradle_settings.notes.min_entries} entries."
        )
        super().__init__(detail=detail, *args, **kwargs)


class InvalidDateFormatException(CradleAPIException):
    """Exception raised when date format is invalid."""

    error_code = NotesErrorCodes.INVALID_DATE_FORMAT

    def __init__(self, date: str, *args, **kwargs) -> None:
        detail = f"The date '{date}' is not in (HH:mm)? DD-MM-YYYY format."
        super().__init__(detail=detail, *args, **kwargs)


class NoteDoesNotExistException(CradleAPIException):
    """Exception raised when a note does not exist or user lacks access."""

    error_code = NotesErrorCodes.NOTE_DOES_NOT_EXIST


class EntryClassesDoNotExistException(CradleAPIException):
    """Exception raised when referenced entry classes don't exist."""

    error_code = NotesErrorCodes.ENTRY_CLASSES_DO_NOT_EXIST

    def __init__(self, classes: Iterable[str], *args, **kwargs) -> None:
        assert len(classes) > 0
        detail = "Some of the referenced entry classes do not exist:\n" + ",\n".join(classes)
        super().__init__(detail=detail, *args, **kwargs)


class EntriesDoNotExistException(CradleAPIException):
    """Exception raised when referenced entries don't exist or user lacks permission."""

    error_code = NotesErrorCodes.ENTRIES_DO_NOT_EXIST

    def __init__(self, links: Iterable[_LinkLike], *args, **kwargs) -> None:
        assert len(links) > 0

        detail = "Some of the referenced entries could not be found:\n"
        for i in links:
            detail += f"({i.key}: {i.value})\n"
        super().__init__(detail=detail.rstrip("\n"), *args, **kwargs)


class NoAccessToEntriesException(CradleAPIException):
    """Exception raised when user doesn't have access to entries (404 to avoid revealing)."""

    error_code = NotesErrorCodes.NO_ACCESS_TO_ENTRIES

    def __init__(self, links: Iterable[Entry], *args, **kwargs) -> None:
        assert len(links) > 0
        super().__init__(detail="Some of the referenced entries could not be found.", *args, **kwargs)


class InvalidReferencesAtLeastException(CradleAPIException):
    """Exception raised when references_at_least parameter is invalid."""

    error_code = NotesErrorCodes.INVALID_REFERENCES_AT_LEAST


class CannotEditNoteException(CradleAPIException):
    """Exception raised when user cannot edit a note."""

    error_code = NotesErrorCodes.CANNOT_EDIT_NOTE


class SnippetNotFoundException(CradleAPIException):
    """Exception raised when a snippet is not found."""

    error_code = NotesErrorCodes.SNIPPET_NOT_FOUND
