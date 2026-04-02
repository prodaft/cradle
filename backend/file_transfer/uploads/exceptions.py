"""Shared exceptions for upload operations."""

from rest_framework import status

from core.exceptions import CradleAPIException, ErrorCode


class UploadErrorCodes(ErrorCode):
    """Generic error codes for upload operations."""

    UPLOAD_NOT_FOUND = (
        status.HTTP_404_NOT_FOUND,
        "Upload Not Found",
        "upload-not-found",
    )
    UPLOAD_EXPIRED = (
        status.HTTP_410_GONE,
        "Upload Expired",
        "upload-expired",
    )
    FILE_NOT_UPLOADED = (
        status.HTTP_400_BAD_REQUEST,
        "File Not Uploaded",
        "file-not-uploaded",
    )
    ALREADY_UPLOADING = (
        status.HTTP_400_BAD_REQUEST,
        "Already Uploading",
        "already-uploading",
    )
    INVALID_FILE_NAME = (
        status.HTTP_400_BAD_REQUEST,
        "Invalid File Name",
        "invalid-file-name",
    )
    QUOTA_EXCEEDED = (
        status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
        "Quota Exceeded",
        "quota-exceeded",
    )
    INVALID_FILE_SIZE = (
        status.HTTP_400_BAD_REQUEST,
        "Invalid File Size",
        "invalid-file-size",
    )


class UploadNotFoundException(CradleAPIException):
    """Exception raised when pending upload is not found."""

    error_code = UploadErrorCodes.UPLOAD_NOT_FOUND


class UploadExpiredException(CradleAPIException):
    """Exception raised when pending upload has expired."""

    error_code = UploadErrorCodes.UPLOAD_EXPIRED


class FileNotUploadedException(CradleAPIException):
    """Exception raised when file was not uploaded to presigned URL."""

    error_code = UploadErrorCodes.FILE_NOT_UPLOADED


class AlreadyUploadingException(CradleAPIException):
    """Exception raised when user is already uploading a file."""

    error_code = UploadErrorCodes.ALREADY_UPLOADING


class InvalidFileNameException(CradleAPIException):
    """Exception raised when file name is invalid or missing."""

    error_code = UploadErrorCodes.INVALID_FILE_NAME


class QuotaExceededException(CradleAPIException):
    """Exception raised when user's upload quota is exceeded."""

    error_code = UploadErrorCodes.QUOTA_EXCEEDED


class InvalidFileSizeException(CradleAPIException):
    """Exception raised when file size is invalid or missing."""

    error_code = UploadErrorCodes.INVALID_FILE_SIZE
