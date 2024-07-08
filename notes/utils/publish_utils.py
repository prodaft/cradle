from typing import Dict
from ..models import Note
from entries.enums import EntryType
from django.db.models.query import QuerySet


class PublishUtils:
    @staticmethod
    def get_report(notes: QuerySet[Note]) -> Dict[str, QuerySet]:
        """Given a QuerySet of notes, construct a dictionary, which
        provides fields for related actors, cases, artifacts and metadata.

        Args:
            notes (QuerySet[Note]): The list of notes.

        Returns:
            Dict[str, QuerySet]: The dictionary, which contains related
            actors, cases, artifacts and metadata.

        """
        entries = Note.objects.get_entries_from_notes(notes)

        return {
            "actors": entries.filter(type=EntryType.ACTOR),
            "cases": entries.filter(type=EntryType.CASE),
            "artifacts": entries.filter(type=EntryType.ARTIFACT),
            "metadata": entries.filter(type=EntryType.METADATA),
            "notes": notes,
        }
