"""Custom exception handler for CRADLE API.

This module provides a custom exception handler that formats all errors according to
RFC 9457 (Problem Details for HTTP APIs) and integrates with DRF Spectacular for
automatic OpenAPI documentation.
"""

import logging

from django.utils import timezone
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.views import exception_handler

from .exceptions import CoreErrorCodes, CradleAPIException

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    """Custom exception handler for DRF that formats all errors according to RFC 9457.

    This handler processes all exceptions and returns a standardized error response format:
    {
        "type": "/errors/error-type",
        "title": "Error Title",
        "status": 400,
        "detail": "Detailed error message",
        "instance": "/api/endpoint",
        "timestamp": "<ISO 8601 datetime>",
        "code": "ERROR_CODE",
        "errors": {...}  # Only for validation errors
    }

    Args:
        exc: The exception that was raised.
        context: Context information about the request.

    Returns:
        Response: Formatted error response.
    """
    # Call DRF's default exception handler first to get the standard error response
    response = exception_handler(exc, context)

    # If DRF didn't handle it, log and return None (will become a 500 error)
    if response is None:
        request = context.get("request")
        logger.exception(
            "Unhandled exception in API",
            extra={
                "path": getattr(request, "path", None),
                "method": getattr(request, "method", None),
            },
        )
        return None

    request = context.get("request")

    # Build the RFC 9457 compliant error response
    error_response = {
        "status": response.status_code,
        "timestamp": timezone.now().isoformat(),
    }

    # Handle CradleAPIException (our custom exceptions)
    if isinstance(exc, CradleAPIException):
        error_response.update(
            {
                "type": exc.get_error_type_uri(),
                "title": exc.get_error_title(),
                "code": exc.get_error_code(),
                "detail": _format_exception_detail(exc.detail, exc.get_error_title),
            }
        )

    # Handle DRF ValidationError
    elif isinstance(exc, DRFValidationError):
        error_response.update(
            {
                "type": CoreErrorCodes.VALIDATION_ERROR.type_uri,
                "title": CoreErrorCodes.VALIDATION_ERROR.title,
                "code": CoreErrorCodes.VALIDATION_ERROR.code,
                "detail": "One or more fields failed validation.",
                "errors": response.data,
            }
        )

    # Handle other DRF exceptions
    else:
        # Map status codes to appropriate error types
        error_code = _get_error_code_for_status(response.status_code)
        error_response.update(
            {
                "type": error_code.type_uri,
                "title": error_code.title,
                "code": error_code.code,
                "detail": _get_detail_from_response(response.data),
            }
        )

    # Add instance path if request is available
    if request:
        error_response["instance"] = request.path

    # Replace response data with our standardized format
    response.data = error_response

    return response


def _format_exception_detail(detail, fallback):
    """Format exception detail for RFC 9457 response.

    Handles None (uses fallback), list (takes first element), and string.
    """
    if detail is None:
        return fallback()
    if isinstance(detail, list):
        return str(detail[0]) if detail else fallback()
    return str(detail)


_STATUS_TO_ERROR_CODE = {
    400: CoreErrorCodes.BAD_REQUEST,
    401: CoreErrorCodes.UNAUTHENTICATED,
    403: CoreErrorCodes.PERMISSION_DENIED,
    404: CoreErrorCodes.NOT_FOUND,
}


def _get_error_code_for_status(status_code: int):
    """Map HTTP status code to appropriate CoreErrorCode. 5xx uses INTERNAL_SERVER_ERROR."""
    if status_code >= 500:
        return CoreErrorCodes.INTERNAL_SERVER_ERROR
    return _STATUS_TO_ERROR_CODE.get(status_code, CoreErrorCodes.BAD_REQUEST)


def _get_detail_from_response(data):
    """Extract detail message from response data.

    Args:
        data: Response data (can be string, dict, list, or None).

    Returns:
        str: Detail message.
    """
    if isinstance(data, str):
        return data
    elif isinstance(data, dict):
        for key in ("detail", "error"):
            if key in data:
                val = data[key]
                if isinstance(val, list):
                    return str(val[0]) if val else "An error occurred"
                return str(val) if val is not None else "An error occurred"
        for value in data.values():
            if isinstance(value, str):
                return value
            if isinstance(value, list) and len(value) > 0:
                return str(value[0])
        return "An error occurred"
    elif isinstance(data, list) and len(data) > 0:
        return str(data[0])
    return "An error occurred"
