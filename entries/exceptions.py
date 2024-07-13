from rest_framework.exceptions import APIException

class EntryTypeMismatchException(APIException):
    status_code = 409
    default_detail = "There already exists an entry subtype type with a different type"
    default_code = "unique"

class DuplicateEntryException(APIException):
    status_code = 409
    default_detail = "There exists another entry with the same name."
    default_code = "unique"

class DuplicateEntityException(APIException):
    status_code = 409
    default_detail = "There exists another entity with the same name."
    default_code = "unique"

class DuplicateArtifactException(APIException):
    status_code = 409
    default_detail = "There exists another artifact with the same name."
    default_code = "unique"

class InvalidRegexException(APIException):
    status_code = 409
    default_detail = "The regex is invalid"
    default_code = "unique"

class InvalidEntryException(APIException):
    status_code = 409
    default_detail = "Entry does not obey the format"
    default_code = "unique"

class InvalidClassFormatException(APIException):
    status_code = 409
    default_detail = "An entry class can only have regex or enum set as their format"
    default_code = "unique"
