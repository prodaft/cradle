from typing import TYPE_CHECKING, Iterable

from rest_framework import status
from core.exceptions import ErrorCode, CradleAPIException

from entries.models import Entry
from management.settings import cradle_settings

if TYPE_CHECKING:
    from entries.models import Link


class NotesErrorCodes(ErrorCode):
    """Error codes for notes operations"""

    INVALID_REQUEST = (
        status.HTTP_400_BAD_REQUEST,
        "Invalid Request",
        "invalid-request"
    )
    NOTE_IS_EMPTY = (
        status.HTTP_400_BAD_REQUEST,
        "Note Is Empty",
        "note-is-empty"
    )
    FIELD_TOO_LONG = (
        status.HTTP_400_BAD_REQUEST,
        "Field Too Long",
        "field-too-long"
    )
    NOT_ENOUGH_REFERENCES = (
        status.HTTP_400_BAD_REQUEST,
        "Not Enough References",
        "not-enough-references"
    )
    INVALID_DATE_FORMAT = (
        status.HTTP_400_BAD_REQUEST,
        "Invalid Date Format",
        "invalid-date-format"
    )
    NOTE_DOES_NOT_EXIST = (
        status.HTTP_404_NOT_FOUND,
        "Note Not Found",
        "note-not-found"
    )
    ENTRY_CLASSES_DO_NOT_EXIST = (
        status.HTTP_404_NOT_FOUND,
        "Entry Classes Not Found",
        "entry-classes-not-found"
    )
    ENTRIES_DO_NOT_EXIST = (
        status.HTTP_404_NOT_FOUND,
        "Entries Not Found",
        "entries-not-found"
    )
    NO_ACCESS_TO_ENTRIES = (
        status.HTTP_403_FORBIDDEN,
        "No Access To Entries",
        "no-access-to-entries"
    )
    INVALID_PAGE_SIZE = (
        status.HTTP_400_BAD_REQUEST,
        "Invalid Page Size",
        "invalid-page-size"
    )
    INVALID_REFERENCES_AT_LEAST = (
        status.HTTP_400_BAD_REQUEST,
        "Invalid References At Least",
        "invalid-references-at-least"
    )
    ENTRY_NOT_FOUND = (
        status.HTTP_404_NOT_FOUND,
        "Entry Not Found",
        "entry-not-found"
    )
    CANNOT_EDIT_NOTE = (
        status.HTTP_403_FORBIDDEN,
        "Cannot Edit Note",
        "cannot-edit-note"
    )
    USER_NOT_FOUND = (
        status.HTTP_404_NOT_FOUND,
        "User Not Found",
        "user-not-found"
    )
    SNIPPET_NOT_FOUND = (
        status.HTTP_404_NOT_FOUND,
        "Snippet Not Found",
        "snippet-not-found"
    )
    PERMISSION_DENIED = (
        status.HTTP_403_FORBIDDEN,
        "Permission Denied",
        "permission-denied"
    )


class InvalidRequestException(CradleAPIException):
    """Exception raised when the request format is invalid"""
    error_code = NotesErrorCodes.INVALID_REQUEST


class NoteIsEmptyException(CradleAPIException):
    """Exception raised when a note is empty"""
    error_code = NotesErrorCodes.NOTE_IS_EMPTY


class FieldTooLongException(CradleAPIException):
    """Exception raised when a field exceeds maximum length"""
    error_code = NotesErrorCodes.FIELD_TOO_LONG

    def __init__(self, field: str, max_length: int, *args, **kwargs) -> None:
        detail = f"The field '{field}' exceeds the maximum length of {max_length} characters."
        super().__init__(detail=detail, *args, **kwargs)


class NotEnoughReferencesException(CradleAPIException):
    """Exception raised when a note doesn't have enough entity/entry references"""
    error_code = NotesErrorCodes.NOT_ENOUGH_REFERENCES

    def __init__(self, *args, **kwargs):
        detail = (
            f"Note does not reference at least {cradle_settings.notes.min_entities} "
            + f"entity and at least {cradle_settings.notes.min_entries} entries."
        )
        super().__init__(detail=detail, *args, **kwargs)


class InvalidDateFormatException(CradleAPIException):
    """Exception raised when date format is invalid"""
    error_code = NotesErrorCodes.INVALID_DATE_FORMAT

    def __init__(self, date, *args, **kwargs):
        detail = f"The date '{date}' is not in (HH:mm)? DD-MM-YYYY format."
        super().__init__(detail=detail, *args, **kwargs)


class NoteDoesNotExistException(CradleAPIException):
    """Exception raised when a note does not exist or user lacks access"""
    error_code = NotesErrorCodes.NOTE_DOES_NOT_EXIST


class EntryClassesDoNotExistException(CradleAPIException):
    """Exception raised when referenced entry classes don't exist"""
    error_code = NotesErrorCodes.ENTRY_CLASSES_DO_NOT_EXIST

    def __init__(self, classes: Iterable[str], *args, **kwargs) -> None:
        assert len(classes) > 0
        detail = "Some of the referenced entry classes do not exist:\n" + ",\n".join(classes)
        super().__init__(detail=detail, *args, **kwargs)


class EntriesDoNotExistException(CradleAPIException):
    """Exception raised when referenced entries don't exist or user lacks permission"""
    error_code = NotesErrorCodes.ENTRIES_DO_NOT_EXIST

    def __init__(self, links: Iterable["Link"], *args, **kwargs) -> None:
        assert len(links) > 0

        detail = (
            "Some of the referenced entries do not exist or "
            + "you don't have the right permissions to access them:\n"
        )

        for i in links:
            detail += f"({i.key}: {i.value})\n"

        detail = detail[:-1]
        super().__init__(detail=detail, *args, **kwargs)


class NoAccessToEntriesException(CradleAPIException):
    """Exception raised when user doesn't have access to entries"""
    error_code = NotesErrorCodes.NO_ACCESS_TO_ENTRIES

    def __init__(self, links: Iterable[Entry], *args, **kwargs) -> None:
        assert len(links) > 0

        detail = (
            "Some of the referenced entries do not exist or you don't "
            + "have the right permissions to access them:\n"
        )

        for i in links:
            detail += f"({i.entry_class.subtype}: {i.name})\n"

        detail = detail[:-1]
        super().__init__(detail=detail, *args, **kwargs)


class InvalidPageSizeException(CradleAPIException):
    """Exception raised when page_size parameter is invalid"""
    error_code = NotesErrorCodes.INVALID_PAGE_SIZE


class InvalidReferencesAtLeastException(CradleAPIException):
    """Exception raised when references_at_least parameter is invalid"""
    error_code = NotesErrorCodes.INVALID_REFERENCES_AT_LEAST


class EntryNotFoundException(CradleAPIException):
    """Exception raised when an entry is not found"""
    error_code = NotesErrorCodes.ENTRY_NOT_FOUND


class CannotEditNoteException(CradleAPIException):
    """Exception raised when user cannot edit a note"""
    error_code = NotesErrorCodes.CANNOT_EDIT_NOTE


class UserNotFoundException(CradleAPIException):
    """Exception raised when a user is not found"""
    error_code = NotesErrorCodes.USER_NOT_FOUND


class SnippetNotFoundException(CradleAPIException):
    """Exception raised when a snippet is not found"""
    error_code = NotesErrorCodes.SNIPPET_NOT_FOUND


class PermissionDeniedException(CradleAPIException):
    """Exception raised when user lacks permission for an operation"""
    error_code = NotesErrorCodes.PERMISSION_DENIED
