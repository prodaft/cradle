from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.request import Request
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.permissions import IsAuthenticated
from access.models import Access
from entries.models import Entry
from notes.models import Note
from itertools import islice
from entries.enums import EntryType
from ..serializers import HomePageStatisticsSerializer
from ..utils import note_artifacts_iterator
from typing import Generator, cast
from user.models import CradleUser
from drf_spectacular.utils import extend_schema, extend_schema_view


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

        accessible_notes = (
            Note.objects.non_fleeting()
            .accessible(user=cast(CradleUser, request.user))
            .order_by("-timestamp")
            .distinct()
        )

        response_data = {}

        response_data["notes"] = list(accessible_notes[:10])

        if request.user.is_cradle_admin:
            response_data["entities"] = Entry.entities.all()
        else:
            response_data["entities"] = Entry.entities.filter(
                pk__in=Access.objects.get_accessible_entity_ids(request.user.id)
            )

        response_data["entities"] = list(islice(response_data["entities"], 3))

        response_data["artifacts"] = list(
            islice(
                note_artifacts_iterator(accessible_notes),
                3,
            )
        )

        return Response(HomePageStatisticsSerializer(response_data).data)
