"""Statistics API views for homepage dashboard data."""

from typing import cast

from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from access.models import Access
from core.openapi import get_common_error_responses
from entries.constants import SUBTYPE_FILE, SUBTYPE_NOTE
from entries.models import Entry
from notes.models import Note
from user.models import CradleUser

from ..serializers import HomePageStatisticsSerializer


@extend_schema_view(
    get=extend_schema(
        operation_id="statistics_retrieve",
        summary="Get user statistics",
        description="Returns statistics about the user's notes and entries. Includes the 10 most recent notes, 3 most recently referenced entities, and 3 most recently referenced artifacts.",  # noqa: E501
        responses={
            200: HomePageStatisticsSerializer,
            **get_common_error_responses(),
        },
    )
)
class StatisticsList(APIView):
    """API view returning homepage statistics: recent notes, entities, and artifacts."""

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        """Return homepage stats: 10 recent notes, 3 entities, 3 artifacts."""
        accessible_notes = (
            Note.objects.non_fleeting()
            .accessible(user=cast(CradleUser, request.user))
            .select_related("author")
            .order_by("-timestamp")
            .distinct()
        )

        notes_list = list(accessible_notes[:10])

        entities_base = (
            Entry.entities.select_related("entry_class")
            .filter(notes__in=accessible_notes)
            .order_by("-notes__timestamp")
            .distinct()
        )
        if not request.user.is_cradle_admin:
            entities_base = entities_base.filter(id__in=Access.objects.get_accessible_entity_ids(request.user.id))
        entities_list = list(entities_base[:3])

        artifacts_list = list(
            Entry.artifacts.filter(notes__in=accessible_notes)
            .exclude(entry_class__subtype__in=(SUBTYPE_NOTE, SUBTYPE_FILE))
            .select_related("entry_class")
            .distinct()
            .order_by("-notes__timestamp")[:3]
        )

        response_data = {
            "notes": notes_list,
            "entities": entities_list,
            "artifacts": artifacts_list,
        }

        serializer = HomePageStatisticsSerializer(response_data)

        return Response(serializer.data, status=status.HTTP_200_OK)
