"""Access-specific exceptions and error codes."""

from rest_framework import status

from core.exceptions import CradleAPIException, ErrorCode


class AccessErrorCodes(ErrorCode):
    """Error codes for access operations."""

    ACCESS_CHANGE_NOT_ALLOWED = (
        status.HTTP_403_FORBIDDEN,
        "Access Change Not Allowed",
        "access-change-not-allowed",
    )


class AccessChangeNotAllowedException(CradleAPIException):
    """Raised when the requester lacks permission to change another user's access."""

    error_code = AccessErrorCodes.ACCESS_CHANGE_NOT_ALLOWED


__all__ = ["AccessErrorCodes", "AccessChangeNotAllowedException"]
