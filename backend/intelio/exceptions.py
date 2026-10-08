"""IntelIO-specific API exceptions and error codes."""

from rest_framework import status

from core.exceptions import CradleAPIException, ErrorCode


class IntelIOErrorCodes(ErrorCode):
    """Error codes for IntelIO operations."""

    UNKNOWN_ENRICHMENT_OPTION = (
        status.HTTP_404_NOT_FOUND,
        "Unknown Enrichment Option",
        "unknown-enrichment-option",
    )
    ENRICHMENT_NOT_FOUND = (
        status.HTTP_404_NOT_FOUND,
        "Enrichment Not Found",
        "enrichment-not-found",
    )
    ENRICHMENT_OPTION_NOT_FOUND = (
        status.HTTP_404_NOT_FOUND,
        "Enrichment Option Not Found",
        "enrichment-option-not-found",
    )
    DIGEST_NOT_FOUND = (
        status.HTTP_404_NOT_FOUND,
        "Digest Not Found",
        "digest-not-found",
    )
    MISSING_FILE = (status.HTTP_400_BAD_REQUEST, "Missing File", "missing-file")
    UNKNOWN_MAPPING = (
        status.HTTP_400_BAD_REQUEST,
        "Unknown Mapping",
        "unknown-mapping",
    )
    INVALID_MAPPING_SELECTION = (
        status.HTTP_400_BAD_REQUEST,
        "Invalid Mapping Selection",
        "invalid-mapping-selection",
    )
    TARGET_TYPE_REQUIRED = (
        status.HTTP_400_BAD_REQUEST,
        "Target Type Required",
        "target-type-required",
    )
    DATA_CONFLICT = (
        status.HTTP_400_BAD_REQUEST,
        "Data Conflict",
        "data-conflict",
    )
    MAPPING_REQUIRED = (
        status.HTTP_400_BAD_REQUEST,
        "Mapping Required",
        "mapping-required",
    )
    INVALID_MAPPING = (
        status.HTTP_400_BAD_REQUEST,
        "Invalid Mapping",
        "invalid-mapping",
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
    DIGEST_UPLOAD_INCOMPLETE = (
        status.HTTP_400_BAD_REQUEST,
        "Digest Upload Incomplete",
        "digest-upload-incomplete",
    )


class UnknownEnrichmentOptionException(CradleAPIException):
    """Exception raised when the requested enrichment option is not in the catalog."""

    error_code = IntelIOErrorCodes.UNKNOWN_ENRICHMENT_OPTION


class EnrichmentNotFoundException(CradleAPIException):
    """Exception raised when enrichment request is not found."""

    error_code = IntelIOErrorCodes.ENRICHMENT_NOT_FOUND


class EnrichmentOptionNotFoundException(CradleAPIException):
    """Exception raised when enricher type is not found in enrichment request."""

    error_code = IntelIOErrorCodes.ENRICHMENT_OPTION_NOT_FOUND


class DigestNotFoundException(CradleAPIException):
    """Exception raised when digest is not found."""

    error_code = IntelIOErrorCodes.DIGEST_NOT_FOUND


class MissingFileException(CradleAPIException):
    """Exception raised when file is missing from request."""

    error_code = IntelIOErrorCodes.MISSING_FILE


class UnknownMappingException(CradleAPIException):
    """Exception raised when mapping class name is not recognized."""

    error_code = IntelIOErrorCodes.UNKNOWN_MAPPING


class InvalidMappingSelectionException(CradleAPIException):
    """Exception raised when class is not a valid mapping class."""

    error_code = IntelIOErrorCodes.INVALID_MAPPING_SELECTION


class TargetTypeRequiredException(CradleAPIException):
    """Exception raised when the mapping target type is required but missing."""

    error_code = IntelIOErrorCodes.TARGET_TYPE_REQUIRED


class DataConflictException(CradleAPIException):
    """Exception raised when a mapping or related data conflicts with existing state."""

    error_code = IntelIOErrorCodes.DATA_CONFLICT


class MappingRequiredException(CradleAPIException):
    """Exception raised when mapping_id is required but missing."""

    error_code = IntelIOErrorCodes.MAPPING_REQUIRED


class InvalidMappingException(CradleAPIException):
    """Exception raised when mapping ID has invalid format (not a valid UUID)."""

    error_code = IntelIOErrorCodes.INVALID_MAPPING


class MappingNotFoundException(CradleAPIException):
    """Exception raised when mapping is not found."""

    error_code = IntelIOErrorCodes.MAPPING_NOT_FOUND


class DigestUploadNotFoundException(CradleAPIException):
    """Exception raised when a digest upload session is not found."""

    error_code = IntelIOErrorCodes.DIGEST_UPLOAD_NOT_FOUND


class DigestUploadExpiredException(CradleAPIException):
    """Exception raised when a digest upload session has expired."""

    error_code = IntelIOErrorCodes.DIGEST_UPLOAD_EXPIRED


class DigestUploadIncompleteException(CradleAPIException):
    """Exception raised when the digest file was not fully uploaded."""

    error_code = IntelIOErrorCodes.DIGEST_UPLOAD_INCOMPLETE
