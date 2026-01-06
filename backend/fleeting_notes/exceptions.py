from rest_framework import status
from core.exceptions import ErrorCode, CradleAPIException


class FleetingNotesErrorCodes(ErrorCode):
    """Error codes for fleeting notes operations"""

    FLEETING_NOTE_NOT_FOUND = (
        status.HTTP_404_NOT_FOUND,
        "Fleeting Note Not Found",
        "fleeting-note-not-found",
    )
    EMPTY_CONTENT = (status.HTTP_400_BAD_REQUEST, "Empty Content", "empty-content")


class FleetingNoteNotFoundException(CradleAPIException):
    """Exception raised when a fleeting note is not found"""

    error_code = FleetingNotesErrorCodes.FLEETING_NOTE_NOT_FOUND


class EmptyContentException(CradleAPIException):
    """Exception raised when content is empty"""

    error_code = FleetingNotesErrorCodes.EMPTY_CONTENT
