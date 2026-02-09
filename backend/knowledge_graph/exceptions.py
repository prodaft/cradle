from rest_framework import status

from core.exceptions import CradleAPIException, ErrorCode


class KnowledgeGraphErrorCodes(ErrorCode):
    """Error codes for knowledge graph operations"""

    INVALID_QUERY_SYNTAX = (
        status.HTTP_400_BAD_REQUEST,
        "Invalid Query Syntax",
        "invalid-query-syntax",
    )
    INVALID_DEPTH = (
        status.HTTP_400_BAD_REQUEST,
        "Invalid Depth",
        "invalid-depth",
    )


class InvalidQuerySyntaxException(CradleAPIException):
    """Exception raised when a graph query has invalid syntax"""

    error_code = KnowledgeGraphErrorCodes.INVALID_QUERY_SYNTAX


class InvalidDepthException(CradleAPIException):
    """Exception raised when depth parameter is out of range"""

    error_code = KnowledgeGraphErrorCodes.INVALID_DEPTH
