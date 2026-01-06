"""
Custom exception handler for CRADLE API.

This module provides a custom exception handler that formats all errors according to
RFC 9457 (Problem Details for HTTP APIs) and integrates with DRF Spectacular for
automatic OpenAPI documentation.
"""

from rest_framework.views import exception_handler
from django.utils import timezone
from rest_framework.exceptions import ValidationError as DRFValidationError
from .exceptions import CradleAPIException, CoreErrorCodes


def custom_exception_handler(exc, context):
    """
    Custom exception handler for DRF that formats all errors according to RFC 9457.

    This handler processes all exceptions and returns a standardized error response format:
    {
        "type": "/errors/error-type",
        "title": "Error Title",
        "status": 400,
        "detail": "Detailed error message",
        "instance": "/api/endpoint",
        "timestamp": "2025-11-08T14:32:10.123456Z",
        "code": "ERROR_CODE",
        "errors": {...}  # Only for validation errors
    }

    Args:
        exc: The exception that was raised
        context: Context information about the request

    Returns:
        Response: Formatted error response
    """
    # Call DRF's default exception handler first to get the standard error response
    response = exception_handler(exc, context)

    # If DRF didn't handle it, return None (will become a 500 error)
    if response is None:
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
                "detail": str(exc.detail) if exc.detail else exc.get_error_title(),
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


def _get_error_code_for_status(status_code: int):
    """
    Map HTTP status code to appropriate CoreErrorCode.

    Args:
        status_code: HTTP status code

    Returns:
        ErrorCode: Appropriate error code enum value
    """
    if status_code == 400:
        return CoreErrorCodes.BAD_REQUEST
    elif status_code == 401:
        return CoreErrorCodes.UNAUTHENTICATED
    elif status_code == 403:
        return CoreErrorCodes.PERMISSION_DENIED
    elif status_code == 404:
        return CoreErrorCodes.NOT_FOUND
    elif status_code >= 500:
        return CoreErrorCodes.INTERNAL_SERVER_ERROR
    else:
        return CoreErrorCodes.BAD_REQUEST


def _get_detail_from_response(data):
    """
    Extract detail message from response data.

    Args:
        data: Response data (can be string, dict, or list)

    Returns:
        str: Detail message
    """
    if isinstance(data, str):
        return data
    elif isinstance(data, dict):
        # Try to get 'detail' key first, then 'error', then first value
        if "detail" in data:
            return data["detail"]
        elif "error" in data:
            return data["error"]
        else:
            # Get first value if it's a string
            for value in data.values():
                if isinstance(value, str):
                    return value
                elif isinstance(value, list) and len(value) > 0:
                    return str(value[0])
        return "An error occurred"
    elif isinstance(data, list) and len(data) > 0:
        return str(data[0])
    else:
        return "An error occurred"
