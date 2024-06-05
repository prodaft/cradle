from typing import Dict
from ..models import Note
from entities.enums import EntityType
from django.db.models.query import QuerySet


class PublishUtils:
    @staticmethod
    def get_report(notes: QuerySet[Note]) -> Dict[str, QuerySet]:
        """Given a QuerySet of notes, construct a dictionary, which
        provides fields for related actors, cases, entries and metadata.

        Args:
            notes (QuerySet[Note]): The list of notes.

        Returns:
            Dict[str, QuerySet]: The dictionary, which contains related
            actors, cases, entries and metadata.

        """
        entities = Note.objects.get_entities_from_notes(notes)

        return {
            "actors": entities.filter(type=EntityType.ACTOR),
            "cases": entities.filter(type=EntityType.CASE),
            "entries": entities.filter(type=EntityType.ENTRY),
            "metadata": entities.filter(type=EntityType.METADATA),
            "notes": notes,
        }
