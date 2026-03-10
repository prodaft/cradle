"""Publish-specific API exceptions and error codes."""

from rest_framework import status

from core.exceptions import CradleAPIException, ErrorCode


class PublishErrorCodes(ErrorCode):
    """Error codes for publish operations."""

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
    REPORT_DELETE_ERROR = (
        status.HTTP_500_INTERNAL_SERVER_ERROR,
        "Report Delete Error",
        "report-delete-error",
    )


class NotesNotFoundException(CradleAPIException):
    """Exception raised when one or more notes are not found."""

    error_code = PublishErrorCodes.NOTES_NOT_FOUND


class StrategyNotFoundException(CradleAPIException):
    """Exception raised when a strategy is not found."""

    error_code = PublishErrorCodes.STRATEGY_NOT_FOUND


class ReportNotFoundException(CradleAPIException):
    """Exception raised when a report is not found."""

    error_code = PublishErrorCodes.REPORT_NOT_FOUND


class ReportAlreadyGeneratingException(CradleAPIException):
    """Exception raised when trying to retry a report that is already being generated."""

    error_code = PublishErrorCodes.REPORT_ALREADY_GENERATING


class ReportAlreadyCompletedException(CradleAPIException):
    """Exception raised when trying to retry a report that is already completed."""

    error_code = PublishErrorCodes.REPORT_ALREADY_COMPLETED


class ReportDeleteErrorException(CradleAPIException):
    """Exception raised when there's an error deleting a report."""

    error_code = PublishErrorCodes.REPORT_DELETE_ERROR


__all__ = [
    "NotesNotFoundException",
    "PublishErrorCodes",
    "ReportAlreadyCompletedException",
    "ReportAlreadyGeneratingException",
    "ReportDeleteErrorException",
    "ReportNotFoundException",
    "StrategyNotFoundException",
]
