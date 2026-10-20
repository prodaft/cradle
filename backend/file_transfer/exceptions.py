"""Exceptions for file transfer operations (download, delete, process).

Upload-specific errors are in file_transfer.uploads.exceptions.
"""

from rest_framework import status

from core.exceptions import CradleAPIException, ErrorCode


class FileTransferErrorCodes(ErrorCode):
    """Error codes for file transfer operations (download, delete, process).

    Upload-related codes live in file_transfer.uploads.exceptions.UploadErrorCodes.
    """

    STORED_FILE_NOT_FOUND = (
        status.HTTP_404_NOT_FOUND,
        "Stored File Not Found",
        "stored-file-not-found",
    )
    FILE_REFERENCE_NOT_FOUND = (
        status.HTTP_404_NOT_FOUND,
        "File Reference Not Found",
        "file-reference-not-found",
    )
    FILE_ACCESS_DENIED = (
        status.HTTP_403_FORBIDDEN,
        "File Access Denied",
        "file-access-denied",
    )
    FILE_TRANSFER_NOTE_NOT_FOUND = (
        status.HTTP_404_NOT_FOUND,
        "File Transfer Note Not Found",
        "file-transfer-note-not-found",
    )


class StoredFileNotFoundException(CradleAPIException):
    """Exception raised when file content is missing from storage (orphaned reference)."""

    error_code = FileTransferErrorCodes.STORED_FILE_NOT_FOUND


class FileReferenceNotFoundException(CradleAPIException):
    """Exception raised when file reference is not found."""

    error_code = FileTransferErrorCodes.FILE_REFERENCE_NOT_FOUND


class FileAccessDeniedException(CradleAPIException):
    """Exception raised when the user can read the file but not change it."""

    error_code = FileTransferErrorCodes.FILE_ACCESS_DENIED


class FileTransferNoteNotFoundException(CradleAPIException):
    """Exception raised when a note is missing or inaccessible in a file-transfer context."""

    error_code = FileTransferErrorCodes.FILE_TRANSFER_NOTE_NOT_FOUND
