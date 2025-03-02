import re
from typing import Dict, NamedTuple

from django.template.loader import render_to_string

from user.models import CradleUser

from .models import Note
from entries.enums import EntryType
from django.db.models.query import QuerySet
from django.conf import settings
from django.template.exceptions import TemplateDoesNotExist

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


def get_guide_note(guide_name: str, request):
    ## Check if the guide name only contains alphanumeric characters and underscores
    if not re.match(r"^[a-zA-Z0-9_]+$", guide_name):
        return None

    try:
        content = render_to_string(
            f"notes/md/{guide_name}.md",
            {"static_location": request.build_absolute_uri(settings.STATIC_URL)},
        )
    except TemplateDoesNotExist:
        return None

    return Note(content=content, author=CradleUser(username="yeet"))
