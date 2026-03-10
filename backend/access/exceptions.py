"""Access-specific exceptions and error codes."""

from rest_framework import status

from core.exceptions import CradleAPIException, ErrorCode


class AccessErrorCodes(ErrorCode):
    """Error codes for access operations."""

    UPDATE_NOT_ALLOWED = (
        status.HTTP_403_FORBIDDEN,
        "Update Not Allowed",
        "update-not-allowed",
    )


class UpdateNotAllowedException(CradleAPIException):
    """Raised when the requester lacks permission to change another user's access."""

    error_code = AccessErrorCodes.UPDATE_NOT_ALLOWED


__all__ = ["AccessErrorCodes", "UpdateNotAllowedException"]
