"""Publish-specific API exceptions and error codes."""

from rest_framework import status

from core.exceptions import CradleAPIException, ErrorCode


class PublishErrorCodes(ErrorCode):
    """Error codes for publish operations."""

    NOTES_NOT_FOUND = (status.HTTP_404_NOT_FOUND, "Notes Not Found", "notes-not-found")
    EXPORT_FORMAT_NOT_FOUND = (
        status.HTTP_404_NOT_FOUND,
        "Export Format Not Found",
        "export-format-not-found",
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
    REPORT_DELETE_FAILED = (
        status.HTTP_500_INTERNAL_SERVER_ERROR,
        "Report Delete Failed",
        "report-delete-failed",
    )


class NotesNotFoundException(CradleAPIException):
    """Exception raised when one or more notes are not found."""

    error_code = PublishErrorCodes.NOTES_NOT_FOUND


class ExportFormatNotFoundException(CradleAPIException):
    """Exception raised when the requested export format is not found."""

    error_code = PublishErrorCodes.EXPORT_FORMAT_NOT_FOUND


class ReportNotFoundException(CradleAPIException):
    """Exception raised when a report is not found."""

    error_code = PublishErrorCodes.REPORT_NOT_FOUND


class ReportAlreadyGeneratingException(CradleAPIException):
    """Exception raised when trying to retry a report that is already being generated."""

    error_code = PublishErrorCodes.REPORT_ALREADY_GENERATING


class ReportAlreadyCompletedException(CradleAPIException):
    """Exception raised when trying to retry a report that is already completed."""

    error_code = PublishErrorCodes.REPORT_ALREADY_COMPLETED


class ReportDeleteFailedException(CradleAPIException):
    """Exception raised when a report could not be deleted."""

    error_code = PublishErrorCodes.REPORT_DELETE_FAILED


__all__ = [
    "ExportFormatNotFoundException",
    "NotesNotFoundException",
    "PublishErrorCodes",
    "ReportAlreadyCompletedException",
    "ReportAlreadyGeneratingException",
    "ReportDeleteFailedException",
    "ReportNotFoundException",
]
