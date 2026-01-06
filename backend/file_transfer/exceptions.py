from rest_framework import status

from core.exceptions import CradleAPIException, ErrorCode


class FileTransferErrorCodes(ErrorCode):
    """Error codes for file transfer operations"""

    MINIO_OBJECT_NOT_FOUND = (
        status.HTTP_404_NOT_FOUND,
        "File Not Found",
        "file-not-found",
    )
    INCORRECT_BUCKET = (
        status.HTTP_400_BAD_REQUEST,
        "Incorrect Bucket",
        "incorrect-bucket",
    )
    INVALID_FILE_NAME = (
        status.HTTP_400_BAD_REQUEST,
        "Invalid File Name",
        "invalid-file-name",
    )
    FILE_REFERENCE_NOT_FOUND = (
        status.HTTP_404_NOT_FOUND,
        "File Reference Not Found",
        "file-reference-not-found",
    )
    INVALID_REQUEST_BODY = (
        status.HTTP_400_BAD_REQUEST,
        "Invalid Request Body",
        "invalid-request-body",
    )
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
    NOTE_NOT_FOUND = (
        status.HTTP_404_NOT_FOUND,
        "Note Not Found",
        "note-not-found",
    )
    ALREADY_UPLOADING = (
        status.HTTP_400_BAD_REQUEST,
        "Already Uploading",
        "already-uploading",
    )


class MinioObjectNotFound(CradleAPIException):
    """Exception raised when a file is not found in MinIO storage"""

    error_code = FileTransferErrorCodes.MINIO_OBJECT_NOT_FOUND


class IncorrectBucketException(CradleAPIException):
    """Exception raised when bucket name is incorrect"""

    error_code = FileTransferErrorCodes.INCORRECT_BUCKET


class InvalidFileNameException(CradleAPIException):
    """Exception raised when file name is invalid or missing"""

    error_code = FileTransferErrorCodes.INVALID_FILE_NAME


class FileReferenceNotFoundException(CradleAPIException):
    """Exception raised when file reference is not found"""

    error_code = FileTransferErrorCodes.FILE_REFERENCE_NOT_FOUND


class InvalidRequestBodyException(CradleAPIException):
    """Exception raised when request body is invalid"""

    error_code = FileTransferErrorCodes.INVALID_REQUEST_BODY


class UploadNotFoundException(CradleAPIException):
    """Exception raised when pending upload is not found"""

    error_code = FileTransferErrorCodes.UPLOAD_NOT_FOUND


class UploadExpiredException(CradleAPIException):
    """Exception raised when pending upload has expired"""

    error_code = FileTransferErrorCodes.UPLOAD_EXPIRED


class FileNotUploadedException(CradleAPIException):
    """Exception raised when file was not uploaded to presigned URL"""

    error_code = FileTransferErrorCodes.FILE_NOT_UPLOADED


class NoteNotFoundException(CradleAPIException):
    """Exception raised when note is not found"""

    error_code = FileTransferErrorCodes.NOTE_NOT_FOUND


class AlreadyUploadingException(CradleAPIException):
    """Exception raised when user is already uploading a file"""

    error_code = FileTransferErrorCodes.ALREADY_UPLOADING
