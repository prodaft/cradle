from rest_framework import status
from core.exceptions import ErrorCode, CradleAPIException


class PublishErrorCodes(ErrorCode):
    """Error codes for publish operations"""

    NOTES_NOT_FOUND = (status.HTTP_404_NOT_FOUND, "Notes Not Found", "notes-not-found")
    STRATEGY_NOT_FOUND = (
        status.HTTP_404_NOT_FOUND,
        "Strategy Not Found",
        "strategy-not-found",
    )
    REPORT_NOT_FOUND = (
        status.HTTP_404_NOT_FOUND,
        "Report Not Found",
        "report-not-found",
    )
    REPORT_ALREADY_GENERATING = (
        status.HTTP_400_BAD_REQUEST,
        "Report Already Generating",
        "report-already-generating",
    )
    REPORT_ALREADY_COMPLETED = (
        status.HTTP_400_BAD_REQUEST,
        "Report Already Completed",
        "report-already-completed",
    )
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
    REPORT_ID_REQUIRED = (
        status.HTTP_400_BAD_REQUEST,
        "Report ID Required",
        "report-id-required",
    )
    REPORT_DELETE_ERROR = (
        status.HTTP_500_INTERNAL_SERVER_ERROR,
        "Report Delete Error",
        "report-delete-error",
    )


class NotesNotFoundException(CradleAPIException):
    """Exception raised when one or more notes are not found"""

    error_code = PublishErrorCodes.NOTES_NOT_FOUND


class StrategyNotFoundException(CradleAPIException):
    """Exception raised when a strategy is not found"""

    error_code = PublishErrorCodes.STRATEGY_NOT_FOUND


class ReportNotFoundException(CradleAPIException):
    """Exception raised when a report is not found"""

    error_code = PublishErrorCodes.REPORT_NOT_FOUND


class ReportAlreadyGeneratingException(CradleAPIException):
    """Exception raised when trying to retry a report that is already being generated"""

    error_code = PublishErrorCodes.REPORT_ALREADY_GENERATING


class ReportAlreadyCompletedException(CradleAPIException):
    """Exception raised when trying to retry a report that is already completed"""

    error_code = PublishErrorCodes.REPORT_ALREADY_COMPLETED


class InvalidPageSizeException(CradleAPIException):
    """Exception raised when page_size parameter is invalid"""

    error_code = PublishErrorCodes.INVALID_PAGE_SIZE


class PageSizeTooLargeException(CradleAPIException):
    """Exception raised when page_size exceeds maximum allowed"""

    error_code = PublishErrorCodes.PAGE_SIZE_TOO_LARGE


class ReportIdRequiredException(CradleAPIException):
    """Exception raised when report ID is required but not provided"""

    error_code = PublishErrorCodes.REPORT_ID_REQUIRED


class ReportDeleteErrorException(CradleAPIException):
    """Exception raised when there's an error deleting a report"""

    error_code = PublishErrorCodes.REPORT_DELETE_ERROR
