from rest_framework import status

from core.exceptions import CradleAPIException, ErrorCode


class NotificationsErrorCodes(ErrorCode):
    """Error codes for notification operations"""

    NOTIFICATION_NOT_FOUND = (
        status.HTTP_404_NOT_FOUND,
        "Notification Not Found",
        "notification-not-found",
    )
    INVALID_PAGE_SIZE = (
        status.HTTP_400_BAD_REQUEST,
        "Invalid Page Size",
        "invalid-page-size",
    )


class NotificationNotFoundException(CradleAPIException):
    """Exception raised when a notification does not exist"""

    error_code = NotificationsErrorCodes.NOTIFICATION_NOT_FOUND


class InvalidPageSizeException(CradleAPIException):
    """Exception raised when page_size parameter is invalid"""

    error_code = NotificationsErrorCodes.INVALID_PAGE_SIZE
