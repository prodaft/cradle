"""Query-specific exceptions and error codes."""

from rest_framework import status

from core.exceptions import CradleAPIException, ErrorCode


class QueryErrorCodes(ErrorCode):
    """Error codes for query operations."""

    INVALID_SEARCH_SYNTAX = (
        status.HTTP_400_BAD_REQUEST,
        "Invalid Search Syntax",
        "invalid-search-syntax",
    )


class InvalidSearchSyntaxException(CradleAPIException):
    """Exception raised when search/query syntax is invalid."""

    error_code = QueryErrorCodes.INVALID_SEARCH_SYNTAX


__all__ = [
    "InvalidSearchSyntaxException",
    "QueryErrorCodes",
]
