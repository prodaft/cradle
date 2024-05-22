from rest_framework.exceptions import APIException


class NoteIsEmptyException(APIException):
    status_code = 400
    default_detail = "The note should not be empty"


class NotEnoughReferencesException(APIException):
    status_code = 400
    default_detail = (
        "Note does not reference at least one case and at least two entities."
    )


class EntitiesDoNotExistException(APIException):
    status_code = 404
    default_detail = "The referenced agents or cases do not exist."


class NoAccessToEntitiesException(APIException):
    status_code = 404
    default_detail = "The referenced agents or cases do not exist."
