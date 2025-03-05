from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.request import Request
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.permissions import IsAuthenticated
from notes.models import Note
from itertools import islice
from entries.enums import EntryType
from ..serializers import HomePageStatisticsSerializer
from typing import cast
from user.models import CradleUser
from drf_spectacular.utils import extend_schema, extend_schema_view


@extend_schema_view(
    get=extend_schema(
        summary="Get User Statistics",
        description="Retrieve user statistics including recent notes and most referenced entities/artifacts.",
        responses={
            200: HomePageStatisticsSerializer,
            401: "User is not authenticated",
        }
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

        accessible_notes = Note.objects.get_accessible_notes(
            user=cast(CradleUser, request.user)
        )

        response_data = {}

        response_data["notes"] = list(accessible_notes[:10])
        response_data["entities"] = list(
            islice(
                Note.objects.note_references_iterator(
                    accessible_notes, EntryType.ENTITY
                ),
                3,
            )
        )

        response_data["artifacts"] = list(
            islice(
                Note.objects.note_references_iterator(
                    accessible_notes, EntryType.ARTIFACT
                ),
                3,
            )
        )

        return Response(HomePageStatisticsSerializer(response_data).data)
