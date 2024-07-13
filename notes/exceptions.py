from rest_framework.exceptions import APIException


class InvalidRequestException(APIException):
    status_code = 400
    default_detail = "The query format is invalid."


class NoteIsEmptyException(APIException):
    status_code = 400
    default_detail = "The note should not be empty."


class NotEnoughReferencesException(APIException):
    status_code = 400
    default_detail = (
        "Note does not reference at least one entity and at least two entries."
    )


class NoteDoesNotExistException(APIException):
    status_code = 404
    default_detail = "The referenced note does not exist."


class EntriesDoNotExistException(APIException):
    status_code = 404
    default_detail = "The referenced entries do not exist."


class NoAccessToEntriesException(APIException):
    status_code = 404
    default_detail = "The referenced entries do not exist."


class NoteNotPublishableException(APIException):
    status_code = 403
    default_detail = "The note is not publishable."
