from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.request import Request
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.permissions import IsAuthenticated
from logs.decorators import log_failed_responses
from notes.models import Note
from itertools import islice
from entities.enums import EntityType
from ..serializers import HomePageStatisticsSerializer
from typing import cast
from user.models import CradleUser


class StatisticsList(APIView):

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    @log_failed_responses
    def get(self, request: Request) -> Response:
        """Fetches some of the user's statistics. More specifically, it
        fetches the 10 most recently written notes the user has access to
        and the 3 cases and actors that were most recently referenced in notes
        the user has access to. The entities are returned starting with the most
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
        response_data["cases"] = list(
            islice(
                Note.objects.note_references_iterator(
                    accessible_notes, EntityType.CASE
                ),
                3,
            )
        )
        response_data["actors"] = list(
            islice(
                Note.objects.note_references_iterator(
                    accessible_notes, EntityType.ACTOR
                ),
                3,
            )
        )

        return Response(HomePageStatisticsSerializer(response_data).data)
