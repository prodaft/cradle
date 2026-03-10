"""Core exception classes for CRADLE API.

This module provides base exception classes that follow RFC 9457 (Problem Details for HTTP APIs).
All API exceptions should inherit from CradleAPIException and define their error codes using
the ErrorCode enum pattern.

Example:
    # In your_app/exceptions.py:
    from core.exceptions import ErrorCode, CradleAPIException

    class YourAppErrorCodes(ErrorCode):
        DUPLICATE_RESOURCE = (409, "Duplicate Resource", "duplicate-resource")
        INVALID_INPUT = (400, "Invalid Input", "invalid-input")

    class DuplicateResourceException(CradleAPIException):
        error_code = YourAppErrorCodes.DUPLICATE_RESOURCE

    # In your views:
    raise DuplicateResourceException(detail="A resource with this name already exists")
"""

from enum import Enum

from rest_framework import status
from rest_framework.exceptions import APIException


class ErrorCode(Enum):
    """Base class for error code enums.

    Each Django app should define their own ErrorCode enum that inherits from this class.
    Each enum value should be a tuple of (http_status_code, error_title, error_type_suffix).

    Example:
        class UserErrorCodes(ErrorCode):
            DUPLICATE_USER = (409, "Duplicate User", "duplicate-user")
            INVALID_PASSWORD = (400, "Invalid Password", "invalid-password")
    """

    def __init__(self, status_code: int, title: str, type_suffix: str):
        self.status_code = status_code
        self.title = title
        self.type_suffix = type_suffix

    @property
    def code(self) -> str:
        """Returns the error code (enum name in UPPER_SNAKE_CASE)."""
        return self.name

    @property
    def type_uri(self) -> str:
        """Returns the error type URI for documentation."""
        return f"/errors/{self.type_suffix}"


class CradleAPIException(APIException):
    """Base exception for all CRADLE API errors.

    This exception is compatible with RFC 9457 (Problem Details for HTTP APIs).
    All custom exceptions should inherit from this class and define an error_code.

    The exception will be automatically formatted by the custom exception handler
    and documented in the OpenAPI specification via DRF Spectacular.

    Attributes:
        error_code: ErrorCode enum value that defines the error type.

    Usage:
        class MyCustomException(CradleAPIException):
            error_code = MyErrorCodes.CUSTOM_ERROR

        # In views:
        raise MyCustomException(detail="Specific details about this occurrence")
    """

    error_code: ErrorCode | None = None

    def __init__(self, detail=None, error_code: ErrorCode | None = None, code=None):
        """Initialize the exception.

        Args:
            detail: Specific details about this occurrence of the error (overrides default).
            error_code: ErrorCode enum value for this exception (overrides class-level).
            code: Passed to DRF APIException (legacy; our handler uses error_code instead).
        """
        if error_code:
            self.error_code = error_code

        if self.error_code:
            self.status_code = self.error_code.status_code
            if detail is None:
                detail = self.error_code.title

        super().__init__(detail, code)

    def get_error_code(self) -> str:
        """Get the machine-readable error code."""
        if self.error_code:
            return self.error_code.code
        return "UNKNOWN_ERROR"

    def get_error_title(self) -> str:
        """Get the error title."""
        if self.error_code:
            return self.error_code.title
        return "An error occurred"

    def get_error_type_uri(self) -> str:
        """Get the error type URI."""
        if self.error_code:
            return self.error_code.type_uri
        return "/errors/unknown-error"


# Core Error Codes - for errors that apply across all apps
class CoreErrorCodes(ErrorCode):
    """Core error codes used across the application."""

    # Authentication & Authorization
    UNAUTHENTICATED = (
        status.HTTP_401_UNAUTHORIZED,
        "Authentication Required",
        "unauthenticated",
    )
    PERMISSION_DENIED = (
        status.HTTP_403_FORBIDDEN,
        "Permission Denied",
        "permission-denied",
    )

    # Generic Errors
    INTERNAL_SERVER_ERROR = (
        status.HTTP_500_INTERNAL_SERVER_ERROR,
        "Internal Server Error",
        "internal-server-error",
    )
    BAD_REQUEST = (status.HTTP_400_BAD_REQUEST, "Bad Request", "bad-request")
    NOT_FOUND = (status.HTTP_404_NOT_FOUND, "Not Found", "not-found")

    # Validation
    VALIDATION_ERROR = (
        status.HTTP_400_BAD_REQUEST,
        "Validation Error",
        "validation-error",
    )
    INVALID_REQUEST = (
        status.HTTP_400_BAD_REQUEST,
        "Invalid Request",
        "invalid-request",
    )
    INVALID_REQUEST_BODY = (
        status.HTTP_400_BAD_REQUEST,
        "Invalid Request Body",
        "invalid-request-body",
    )

    # Pagination
    INVALID_PAGE_SIZE = (
        status.HTTP_400_BAD_REQUEST,
        "Invalid Page Size",
        "invalid-page-size",
    )
    PAGE_SIZE_TOO_LARGE = (
        status.HTTP_400_BAD_REQUEST,
        "Page Size Too Large",
        "page-size-too-large",
    )
    INVALID_PAGE = (
        status.HTTP_400_BAD_REQUEST,
        "Invalid Page",
        "invalid-page",
    )


# Convenience exception classes for common errors
class ValidationException(CradleAPIException):
    """Exception for validation errors."""

    error_code = CoreErrorCodes.VALIDATION_ERROR


class UnauthenticatedException(CradleAPIException):
    """Exception for authentication errors."""

    error_code = CoreErrorCodes.UNAUTHENTICATED


class PermissionDeniedException(CradleAPIException):
    """Exception for permission errors."""

    error_code = CoreErrorCodes.PERMISSION_DENIED


class BadRequestException(CradleAPIException):
    """Exception for bad request errors."""

    error_code = CoreErrorCodes.BAD_REQUEST


class InvalidRequestException(CradleAPIException):
    """Exception for invalid request parameters."""

    error_code = CoreErrorCodes.INVALID_REQUEST


class InvalidPageSizeException(CradleAPIException):
    """Exception for invalid page_size parameter."""

    error_code = CoreErrorCodes.INVALID_PAGE_SIZE


class PageSizeTooLargeException(CradleAPIException):
    """Exception for page_size exceeding maximum."""

    error_code = CoreErrorCodes.PAGE_SIZE_TOO_LARGE


class InvalidPageException(CradleAPIException):
    """Exception for invalid page parameter (e.g. page < 1)."""

    error_code = CoreErrorCodes.INVALID_PAGE
