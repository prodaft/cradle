"""Knowledge graph API exceptions and error codes."""

from rest_framework import status

from core.exceptions import CradleAPIException, ErrorCode


class KnowledgeGraphErrorCodes(ErrorCode):
    """Error codes for knowledge graph operations."""

    INVALID_DEPTH = (
        status.HTTP_400_BAD_REQUEST,
        "Invalid Depth",
        "invalid-depth",
    )


class InvalidDepthException(CradleAPIException):
    """Exception raised when depth parameter is out of range."""

    error_code = KnowledgeGraphErrorCodes.INVALID_DEPTH
