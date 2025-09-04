from itertools import islice
from typing import cast

from access.models import Access
from drf_spectacular.utils import extend_schema, extend_schema_view
from entries.models import Entry
from notes.models import Note
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication
from user.models import CradleUser

from ..serializers import (
    HomePageStatisticsSerializer,
    StatisticsEntrySerializer,
    StatisticsNoteSerializer,
)


@extend_schema_view(
    get=extend_schema(
        summary="Get user statistics",
        description="Returns statistics about the user's notes and entries. Includes the 10 most recent notes, 3 most recently referenced entities, and 3 most recently referenced artifacts.",  # noqa: E501
        responses={
            200: HomePageStatisticsSerializer,
            401: {"description": "User is not authenticated"},
        },
    )
)
class StatisticsList(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        """Fetches some of the user's statistics. More specifically, it
        fetches the 10 most recently written notes the user has access to
        and the 3 entities and artifacts that were most recently referenced in notes
        the user has access to. The entries are returned starting with the most
        recent ones.

        Args:
            request: The request that was sent.

        Returns:
            Response(status=200): Returns the statistics of the user.
            Response("User is not authenticated", status=401): If the user making the
            request is not authenticated.
        """

        from django.db.models import Prefetch

        # Optimize notes queryset with prefetching
        entries_prefetch = Prefetch(
            "entries", queryset=Entry.objects.select_related("entry_class")
        )

        accessible_notes = (
            Note.objects.non_fleeting()
            .accessible(user=cast(CradleUser, request.user))
            .select_related("author", "editor")
            .prefetch_related(entries_prefetch, "files")
            .order_by("-timestamp")
            .distinct()
        )

        # Get first 10 notes
        notes_list = list(accessible_notes[:10])

        # Get entities with prefetching
        if request.user.is_cradle_admin:
            entities_qs = Entry.entities.select_related("entry_class").all()
        else:
            entities_qs = Entry.entities.select_related("entry_class").filter(
                pk__in=Access.objects.get_accessible_entity_ids(request.user.id)
            )
        entities_list = list(islice(entities_qs, 3))

        # Get artifacts directly from database instead of iterating through notes
        artifacts_list = list(
            Entry.objects.filter(
                notes__in=accessible_notes, entry_class__type="artifact"
            )
            .exclude(entry_class__subtype__in=("virtual", "file"))
            .select_related("entry_class")
            .distinct()
            .order_by("-notes__timestamp")[:3]
        )

        # Use optimized serializers
        notes_serializer = StatisticsNoteSerializer(truncate=150, many=True)
        entities_serializer = StatisticsEntrySerializer(many=True)
        artifacts_serializer = StatisticsEntrySerializer(many=True)

        response_data = {
            "notes": notes_serializer.to_representation(notes_list),
            "entities": entities_serializer.to_representation(entities_list),
            "artifacts": artifacts_serializer.to_representation(artifacts_list),
        }

        return Response(response_data)
