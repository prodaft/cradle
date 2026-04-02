"""Knowledge graph API exceptions and error codes."""

from rest_framework import status

from core.exceptions import CradleAPIException, ErrorCode


class KnowledgeGraphErrorCodes(ErrorCode):
    """Error codes for knowledge graph operations."""

    DEPTH_OUT_OF_RANGE = (
        status.HTTP_400_BAD_REQUEST,
        "Depth Out of Range",
        "depth-out-of-range",
    )


class DepthOutOfRangeException(CradleAPIException):
    """Exception raised when depth parameter is out of range."""

    error_code = KnowledgeGraphErrorCodes.DEPTH_OUT_OF_RANGE

    def __init__(self, detail=None, error_code=None, code=None):
        if detail is None:
            detail = "Choose a depth from 0 to 5."
        super().__init__(detail=detail, error_code=error_code, code=code)
