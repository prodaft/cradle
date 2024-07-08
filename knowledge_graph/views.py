from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.request import Request
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.permissions import IsAuthenticated
from notes.models import Note
from user.models import CradleUser
from .serializers import KnowledgeGraphSerializer
from typing import cast
from logs.decorators import log_failed_responses


class KnowledgeGraphList(APIView):

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    @log_failed_responses
    def get(self, request: Request) -> Response:
        """Allow a user to view the Knowledge Graph containing all Entries
        they can access. The Knowledge Graph is represented as two arrays:
        "entries" and "links". The "entries" array contains a list of
        entries which are connected using notes the User has access to,
        while the "links" array contains pairs of id's, each link
        representing a connection between two entries through a note
        visible to the user.

            Args:
                request(Request): The request that was sent.

            Returns:
                Response(status=200): A JSON response containing the
                    graph structure if the request was successful
                Response("User is not authenticated.", status=401):
                    if the user is not authenticated.
        """
        notes = Note.objects.get_accessible_notes(
            cast(CradleUser, request.user)
        ).values("id")
        links = Note.objects.get_links(notes)

        return Response(
            KnowledgeGraphSerializer(
                {
                    "entries": Note.objects.get_entries_from_notes(notes),
                    "links": links,
                }
            ).data
        )
