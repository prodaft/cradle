from django.db.models.query import QuerySet
from typing import Dict
from rest_framework.utils.serializer_helpers import ReturnDict
from user.models import CradleUser
from entities.models import Entity
from entities.serializers.entity_serializers import (
    CaseSerializer,
    ActorSerializer,
    MetadataSerializer,
    EntrySerializer,
)
from entities.serializers.dashboard_serializers import (
    NoteDashboardSerializer,
    CaseAccessSerializer,
)
from access.models import Access
from access.enums import AccessType
from ..enums import EntityType
from notes.models import Note


class CaseUtils:

    @staticmethod
    def get_dashboard_json(
        case: Entity,
        notes: QuerySet,
        actors: QuerySet,
        cases: QuerySet,
        metadata: QuerySet,
        entries: QuerySet,
        user: CradleUser,
    ) -> Dict[str, Dict[str, ReturnDict]]:
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
            "case": CaseSerializer(case).data,
            "notes": NoteDashboardSerializer(note_list, many=True).data,
            "actors": ActorSerializer(actors, many=True).data,
            "cases": CaseAccessSerializer(case_list, many=True).data,
            "entries": EntrySerializer(entries, many=True).data,
            "metadata": MetadataSerializer(metadata, many=True).data,
        }

    @staticmethod
    def get_accessible_notes(user: CradleUser, entity_id: int) -> QuerySet:
        """Get the notes of a case that the user has access to

        Args:
            user: The user whose access is being checked
            entity_id: The id of the entiy whose notes are being retrieved

        Returns:
            QuerySet: The notes of the case that the user has access to
        """

        if user.is_superuser:
            return Entity.objects.get_all_notes(entity_id)

        accessible_cases = Access.objects.filter(
            user=user, access_type__in=[AccessType.READ_WRITE, AccessType.READ]
        ).values_list("case_id", flat=True)

        inaccessible_cases = (
            Entity.objects.filter(type=EntityType.CASE)
            .exclude(id__in=accessible_cases)
            .values_list("id", flat=True)
        )

        inaccessible_notes = Note.objects.filter(
            entities__id__in=inaccessible_cases, entities__type=EntityType.CASE
        ).values_list("id", flat=True)

        return (
            Entity.objects.get(id=entity_id)
            .note_set.exclude(id__in=inaccessible_notes)
            .order_by("-timestamp")
            .distinct()
        )
