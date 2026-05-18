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
    NO_FILE_SPECIFIED = (
        status.HTTP_400_BAD_REQUEST,
        "No File Specified",
        "no-file-specified",
    )
    INVALID_FILE_REFERENCE = (
        status.HTTP_400_BAD_REQUEST,
        "Invalid File Reference",
        "invalid-file-reference",
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


class NoFileSpecifiedException(CradleAPIException):
    """Exception raised when file_id query parameter is required but missing."""

    error_code = FileTransferErrorCodes.NO_FILE_SPECIFIED


class InvalidFileReferenceException(CradleAPIException):
    """Exception raised when file_id parameter has invalid format (e.g. not a valid UUID)."""

    error_code = FileTransferErrorCodes.INVALID_FILE_REFERENCE


class FileAccessDeniedException(CradleAPIException):
    """Exception raised when user does not have access to the file."""

    error_code = FileTransferErrorCodes.FILE_ACCESS_DENIED


class FileTransferNoteNotFoundException(CradleAPIException):
    """Exception raised when a note is missing or inaccessible in a file-transfer context."""

    error_code = FileTransferErrorCodes.FILE_TRANSFER_NOTE_NOT_FOUND
