"""Notification-specific API exceptions."""

from rest_framework import status

from core.exceptions import CradleAPIException, ErrorCode


class NotificationErrorCodes(ErrorCode):
    """Error codes for notification operations."""

    NOTIFICATION_NOT_FOUND = (
        status.HTTP_404_NOT_FOUND,
        "Notification Not Found",
        "notification-not-found",
    )


class NotificationNotFoundException(CradleAPIException):
    """Exception raised when a notification does not exist."""

    error_code = NotificationErrorCodes.NOTIFICATION_NOT_FOUND


__all__ = [
    "NotificationErrorCodes",
    "NotificationNotFoundException",
]
