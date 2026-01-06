from rest_framework import status
from core.exceptions import ErrorCode, CradleAPIException


class AccessErrorCodes(ErrorCode):
    """Error codes for access operations"""

    USER_NOT_FOUND = (status.HTTP_404_NOT_FOUND, "User Not Found", "user-not-found")
    ENTITY_NOT_FOUND = (
        status.HTTP_404_NOT_FOUND,
        "Entity Not Found",
        "entity-not-found",
    )
    UPDATE_NOT_ALLOWED = (
        status.HTTP_403_FORBIDDEN,
        "Update Not Allowed",
        "update-not-allowed",
    )
    INVALID_REQUEST = (
        status.HTTP_400_BAD_REQUEST,
        "Invalid Request",
        "invalid-request",
    )


class UserNotFoundException(CradleAPIException):
    """Exception raised when a user is not found"""

    error_code = AccessErrorCodes.USER_NOT_FOUND


class EntityNotFoundException(CradleAPIException):
    """Exception raised when an entity is not found"""

    error_code = AccessErrorCodes.ENTITY_NOT_FOUND


class UpdateNotAllowedException(CradleAPIException):
    """Exception raised when user is not allowed to update access"""

    error_code = AccessErrorCodes.UPDATE_NOT_ALLOWED


class InvalidRequestException(CradleAPIException):
    """Exception raised when request is invalid"""

    error_code = AccessErrorCodes.INVALID_REQUEST
