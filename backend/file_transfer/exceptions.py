"""Exceptions for file transfer operations (download, delete, process).

Upload-specific errors are in file_transfer.uploads.exceptions.
"""

from rest_framework import status

from core.exceptions import CradleAPIException, ErrorCode


class FileTransferErrorCodes(ErrorCode):
    """Error codes for file transfer operations (download, delete, process).

    Upload-related codes live in file_transfer.uploads.exceptions.UploadErrorCodes.
    """

    MINIO_OBJECT_NOT_FOUND = (
        status.HTTP_404_NOT_FOUND,
        "File Not Found",
        "file-not-found",
    )
    FILE_REFERENCE_NOT_FOUND = (
        status.HTTP_404_NOT_FOUND,
        "File Reference Not Found",
        "file-reference-not-found",
    )
    FILE_ID_REQUIRED = (
        status.HTTP_400_BAD_REQUEST,
        "File ID Required",
        "file-id-required",
    )
    INVALID_FILE_ID = (
        status.HTTP_400_BAD_REQUEST,
        "Invalid File ID",
        "invalid-file-id",
    )
    FILE_ACCESS_DENIED = (
        status.HTTP_403_FORBIDDEN,
        "Access Denied",
        "file-access-denied",
    )
    NOTE_NOT_FOUND = (
        status.HTTP_404_NOT_FOUND,
        "Note Not Found",
        "note-not-found",
    )


class MinioObjectNotFound(CradleAPIException):
    """Exception raised when a file is not found in MinIO storage."""

    error_code = FileTransferErrorCodes.MINIO_OBJECT_NOT_FOUND


class FileReferenceNotFoundException(CradleAPIException):
    """Exception raised when file reference is not found."""

    error_code = FileTransferErrorCodes.FILE_REFERENCE_NOT_FOUND


class FileIdRequiredException(CradleAPIException):
    """Exception raised when fileId query parameter is required but missing."""

    error_code = FileTransferErrorCodes.FILE_ID_REQUIRED


class InvalidFileIdException(CradleAPIException):
    """Exception raised when fileId parameter has invalid format (e.g. not a valid UUID)."""

    error_code = FileTransferErrorCodes.INVALID_FILE_ID


class FileAccessDeniedException(CradleAPIException):
    """Exception raised when user does not have access to the file."""

    error_code = FileTransferErrorCodes.FILE_ACCESS_DENIED


class NoteNotFoundException(CradleAPIException):
    """Exception raised when note is not found."""

    error_code = FileTransferErrorCodes.NOTE_NOT_FOUND
