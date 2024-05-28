from django.db.models.query import QuerySet
from typing import Dict, Any
from user.models import CradleUser
from entities.models import Entity
from entities.serializers.entity_serializers import (
    CaseSerializer,
    ActorSerializer,
    MetadataSerializer,
    EntrySerializer,
)
from ..serializers.dashboard_serializers import (
    NoteDashboardSerializer,
    CaseAccessSerializer,
)
from access.models import Access
from access.enums import AccessType


class DashboardUtils:

    @staticmethod
    def get_dashboard_json(
        entity: Entity,
        notes: QuerySet,
        actors: QuerySet,
        cases: QuerySet,
        metadata: QuerySet,
        entries: QuerySet,
        user: CradleUser,
    ) -> Dict[str, Any]:
        """Return a dictionary containing the dashboard of the case

        Args:
            case: The case whose dashboard is being retrieved
            notes: The notes of the case
            actors: The actors of the case
            cases: The cases of the case
            entries: The entries of the case
            metadata: The metadata of the case

        Returns:
            dict: A dictionary containing the dashboard of the case
        """

        case_list = []

        for c in cases:
            case_json = CaseSerializer(c).data
            case_json["access"] = Access.objects.has_access_to_cases(
                user, {c}, {AccessType.READ, AccessType.READ_WRITE}
            )
            case_list.append(case_json)

        note_list = []

        for note in notes:
            note_json = NoteDashboardSerializer(note).data
            if len(note_json["content"]) > 200:
                note_json["content"] = note_json["content"][:200] + "..."
            note_list.append(note_json)

        return {
            "id": entity.id,
            "name": entity.name,
            "description": entity.description,
            "type": entity.type,
            "subtype": entity.subtype,
            "notes": NoteDashboardSerializer(note_list, many=True).data,
            "actors": ActorSerializer(actors, many=True).data,
            "cases": CaseAccessSerializer(case_list, many=True).data,
            "entries": EntrySerializer(entries, many=True).data,
            "metadata": MetadataSerializer(metadata, many=True).data,
        }
