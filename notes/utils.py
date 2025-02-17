import re
from typing import Dict, NamedTuple
from .models import Note
from entries.enums import EntryType
from django.db.models.query import QuerySet

LINK_REGEX = r"\[\[(?P<cl_type>[^:\|\]]+?):(?P<cl_value>(?:\\[\[\]\|]|[^\[\]\|])+?)(?:\|(?P<cl_alias>(?:\\[\[\]\|]|[^\[\]\|])+?))?\]\]"  # noqa: E501 to avoid splitting the regex on two lines


class Link(NamedTuple):
    class_subtype: str
    name: str


class PublishUtils:
    @staticmethod
    def get_report(notes: QuerySet[Note]) -> Dict[str, QuerySet]:
        """Given a QuerySet of notes, construct a dictionary, which
        provides fields for related entities and artifacts.

        Args:
            notes (QuerySet[Note]): The list of notes.

        Returns:
            Dict[str, QuerySet]: The dictionary, which contains related
            entities and artifacts.

        """
        entries = Note.objects.get_entries_from_notes(notes)

        return {
            "entities": entries.filter(entry_class__type=EntryType.ENTITY),
            "artifacts": entries.filter(entry_class__type=EntryType.ARTIFACT),
            "notes": notes,
        }


def extract_links(s: str) -> list[Link]:
    references = re.findall(LINK_REGEX, s)

    for r in references:
        yield Link(r[0], r[1])


def get_howtouse_note():
    pass
