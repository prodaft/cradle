"""Query-specific exceptions and error codes."""

from rest_framework import status

from core.exceptions import CradleAPIException, ErrorCode


class QueryErrorCodes(ErrorCode):
    """Error codes for query operations."""

    INVALID_QUERY_SYNTAX = (
        status.HTTP_400_BAD_REQUEST,
        "Invalid Query Syntax",
        "invalid-query-syntax",
    )


class InvalidQuerySyntaxException(CradleAPIException):
    """Exception raised when query syntax is invalid."""

    error_code = QueryErrorCodes.INVALID_QUERY_SYNTAX


__all__ = [
    "InvalidQuerySyntaxException",
    "QueryErrorCodes",
]
