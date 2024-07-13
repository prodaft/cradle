from typing import Dict
from ..models import Note
from entries.enums import EntryType
from django.db.models.query import QuerySet


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
            "entities": entries.filter(type=EntryType.ENTITY),
            "artifacts": entries.filter(type=EntryType.ARTIFACT),
            "notes": notes,
        }
