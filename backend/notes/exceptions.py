from typing import Iterable, TYPE_CHECKING

from entries.models import Entry
from rest_framework.exceptions import APIException

from management.settings import cradle_settings

if TYPE_CHECKING:
    from entries.models import Link


class InvalidRequestException(APIException):
    status_code = 400
    default_detail = "The query format is invalid."


class NoteIsEmptyException(APIException):
    status_code = 400
    default_detail = "The note should not be empty."


class FieldTooLongException(APIException):
    status_code = 400

    def __init__(self, field: str, max_length: int, *args, **kwargs) -> None:
        self.default_detail = f"The field '{field}' exceeds the maximum length of {max_length} characters."
        super().__init__(*args, **kwargs)


class NotEnoughReferencesException(APIException):
    status_code = 400

    def __init__(self, *args, **kwargs):
        self.default_detail = (
            f"Note does not reference at least {cradle_settings.notes.min_entities} "
            + f"entity and at least {cradle_settings.notes.min_entries} entries."
        )

        super().__init__(*args, **kwargs)


class InvalidDateFormatException(APIException):
    status_code = 400

    def __init__(self, date, *args, **kwargs):
        self.default_detail = f"The date '{date}' is not in (HH:mm)? DD-MM-YYYY format."

        super().__init__(*args, **kwargs)


class NoteDoesNotExistException(APIException):
    status_code = 404
    default_detail = "The referenced note does not exist or you do not have access."


class EntryClassesDoNotExistException(APIException):
    status_code = 404

    def __init__(self, classes: Iterable[str], *args, **kwargs) -> None:
        assert len(classes) > 0

        self.default_detail = (
            "Some of the referenced entry classes do not exist:\n" + ",\n".join(classes)
        )
        super().__init__(*args, **kwargs)


class EntriesDoNotExistException(APIException):
    status_code = 404

    def __init__(self, links: Iterable["Link"], *args, **kwargs) -> None:
        assert len(links) > 0

        self.default_detail = (
            "Some of the referenced entries do not exist or "
            + "you don't have the right permissions to access them:\n"
        )

        for i in links:
            self.default_detail += f"({i.key}: {i.value})\n"

        self.default_detail = self.default_detail[:-1]
        super().__init__(*args, **kwargs)


class NoAccessToEntriesException(APIException):
    status_code = 404

    def __init__(self, links: Iterable[Entry], *args, **kwargs) -> None:
        assert len(links) > 0

        self.default_detail = (
            "Some of the referenced entries do not exist or you don't "
            + "have the right permissions to access them:\n"
        )

        for i in links:
            self.default_detail += f"({i.entry_class.subtype}: {i.name})\n"

        self.default_detail = self.default_detail[:-1]
        super().__init__(*args, **kwargs)


class NoteNotPublishableException(APIException):
    status_code = 403
    default_detail = "The note is not publishable."
