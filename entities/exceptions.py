from rest_framework.exceptions import APIException


class DuplicateActorException(APIException):
    status_code = 409
    default_detail = "There exists another actor with the same name."
    default_code = "unique"


class DuplicateCaseException(APIException):
    status_code = 409
    default_detail = "There exists another case with the same name."
    default_code = "unique"


class DuplicateEntryException(APIException):
    status_code = 409
    default_detail = "There exists another entry with the same name."
    default_code = "unique"


class DuplicateMetadataException(APIException):
    status_code = 409
    default_detail = "There exists another metadata with the same name."
    default_code = "unique"
