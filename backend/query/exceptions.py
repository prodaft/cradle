from rest_framework import status
from core.exceptions import ErrorCode, CradleAPIException


class QueryErrorCodes(ErrorCode):
    """Error codes for query operations"""

    INVALID_PAGE_SIZE = (
        status.HTTP_400_BAD_REQUEST,
        "Invalid Page Size",
        "invalid-page-size",
    )
    INVALID_QUERY_SYNTAX = (
        status.HTTP_400_BAD_REQUEST,
        "Invalid Query Syntax",
        "invalid-query-syntax",
    )


class InvalidPageSizeException(CradleAPIException):
    """Exception raised when page_size parameter is invalid"""

    error_code = QueryErrorCodes.INVALID_PAGE_SIZE


class InvalidQuerySyntaxException(CradleAPIException):
    """Exception raised when query syntax is invalid"""

    error_code = QueryErrorCodes.INVALID_QUERY_SYNTAX
