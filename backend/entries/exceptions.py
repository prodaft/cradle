from rest_framework.exceptions import APIException


class EntryTypeMismatchException(APIException):
    status_code = 409
    default_detail = (
        "There already exists an entry" "subtype type with a different type"
    )
    default_code = "unique"


class EntryTypeDoesNotExist(APIException):
    status_code = 404
    default_detail = "The entry type you requested could not be found."
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

    def __init__(self, entry_class: str, data: str, *args, **kwargs) -> None:
        self.default_detail = (
            f"Entry ({entry_class}: {data}) does not"
            + " obey the specified format for the entry type!"
        )
        super().__init__(*args, **kwargs)

    default_code = "unique"


class AliasCannotBeLinked(APIException):
    status_code = 409
    default_detail = "An alias cannot be linked to directly!"
    default_code = "unique"


class InvalidClassFormatException(APIException):
    status_code = 409
    default_detail = "An entry class can only have regex or enum set as their format"
    default_code = "unique"


class EntryMustHaveASubtype(APIException):
    status_code = 400
    default_detail = "An entry must always specify a subtype"
    default_code = "unique"


class ClassBreaksHierarchyException(APIException):
    status_code = 400
    default_detail = "Entr"
    default_code = "unique"

    def __init__(self, entry_class: str, *args, **kwargs) -> None:
        self.default_detail = f"The class conflicts with existing class '{entry_class}'"
        super().__init__(*args, **kwargs)

    default_code = "unique"
