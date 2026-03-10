"""IntelIO-specific API exceptions and error codes."""

from rest_framework import status

from core.exceptions import CradleAPIException, ErrorCode


class IntelioErrorCodes(ErrorCode):
    """Error codes for intelio operations."""

    ENRICHER_NOT_FOUND = (
        status.HTTP_404_NOT_FOUND,
        "Enricher Not Found",
        "enricher-not-found",
    )
    ENRICHMENT_REQUEST_NOT_FOUND = (
        status.HTTP_404_NOT_FOUND,
        "Enrichment Request Not Found",
        "enrichment-request-not-found",
    )
    ENRICHER_TYPE_NOT_FOUND = (
        status.HTTP_404_NOT_FOUND,
        "Enricher Type Not Found",
        "enricher-type-not-found",
    )
    DIGEST_NOT_FOUND = (
        status.HTTP_404_NOT_FOUND,
        "Digest Not Found",
        "digest-not-found",
    )
    MISSING_FILE = (status.HTTP_400_BAD_REQUEST, "Missing File", "missing-file")
    INVALID_CLASS_NAME = (
        status.HTTP_400_BAD_REQUEST,
        "Invalid Class Name",
        "invalid-class-name",
    )
    NOT_MAPPING_CLASS = (
        status.HTTP_400_BAD_REQUEST,
        "Not a Valid Mapping Class",
        "not-mapping-class",
    )
    INTERNAL_CLASS_REQUIRED = (
        status.HTTP_400_BAD_REQUEST,
        "Internal Class Required",
        "internal-class-required",
    )
    INTEGRITY_ERROR = (
        status.HTTP_400_BAD_REQUEST,
        "Integrity Error",
        "integrity-error",
    )
    MAPPING_ID_REQUIRED = (
        status.HTTP_400_BAD_REQUEST,
        "Mapping ID Required",
        "mapping-id-required",
    )
    INVALID_MAPPING_ID = (
        status.HTTP_400_BAD_REQUEST,
        "Invalid Mapping ID",
        "invalid-mapping-id",
    )
    MAPPING_NOT_FOUND = (
        status.HTTP_404_NOT_FOUND,
        "Mapping Not Found",
        "mapping-not-found",
    )
    DIGEST_UPLOAD_NOT_FOUND = (
        status.HTTP_404_NOT_FOUND,
        "Digest Upload Not Found",
        "digest-upload-not-found",
    )
    DIGEST_UPLOAD_EXPIRED = (
        status.HTTP_410_GONE,
        "Digest Upload Expired",
        "digest-upload-expired",
    )
    DIGEST_FILE_NOT_UPLOADED = (
        status.HTTP_400_BAD_REQUEST,
        "Digest File Not Uploaded",
        "digest-file-not-uploaded",
    )


class EnricherNotFoundException(CradleAPIException):
    """Exception raised when enricher is not found."""

    error_code = IntelioErrorCodes.ENRICHER_NOT_FOUND


class EnrichmentRequestNotFoundException(CradleAPIException):
    """Exception raised when enrichment request is not found."""

    error_code = IntelioErrorCodes.ENRICHMENT_REQUEST_NOT_FOUND


class EnricherTypeNotFoundException(CradleAPIException):
    """Exception raised when enricher type is not found in enrichment request."""

    error_code = IntelioErrorCodes.ENRICHER_TYPE_NOT_FOUND


class DigestNotFoundException(CradleAPIException):
    """Exception raised when digest is not found."""

    error_code = IntelioErrorCodes.DIGEST_NOT_FOUND


class MissingFileException(CradleAPIException):
    """Exception raised when file is missing from request."""

    error_code = IntelioErrorCodes.MISSING_FILE


class InvalidClassNameException(CradleAPIException):
    """Exception raised when class name is invalid."""

    error_code = IntelioErrorCodes.INVALID_CLASS_NAME


class NotMappingClassException(CradleAPIException):
    """Exception raised when class is not a valid mapping class."""

    error_code = IntelioErrorCodes.NOT_MAPPING_CLASS


class InternalClassRequiredException(CradleAPIException):
    """Exception raised when internal_class field is required but missing."""

    error_code = IntelioErrorCodes.INTERNAL_CLASS_REQUIRED


class IntegrityErrorException(CradleAPIException):
    """Exception raised when database integrity constraint is violated."""

    error_code = IntelioErrorCodes.INTEGRITY_ERROR


class MappingIdRequiredException(CradleAPIException):
    """Exception raised when mapping_id is required but missing."""

    error_code = IntelioErrorCodes.MAPPING_ID_REQUIRED


class InvalidMappingIdException(CradleAPIException):
    """Exception raised when mapping ID has invalid format (not a valid UUID)."""

    error_code = IntelioErrorCodes.INVALID_MAPPING_ID


class MappingNotFoundException(CradleAPIException):
    """Exception raised when mapping is not found."""

    error_code = IntelioErrorCodes.MAPPING_NOT_FOUND
