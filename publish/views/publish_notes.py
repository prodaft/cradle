from rest_framework.response import Response
from rest_framework.request import Request
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.permissions import IsAuthenticated

from publish.strategies.catalyst import CatalystPublish
from ..models import Note

from logs.decorators import log_failed_responses
from user.models import CradleUser
from access.models import Access

from typing import cast


class PublishView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    @log_failed_responses
    def post(self, request: Request) -> Response:
        """Allow a user to publish a set of notes, using a given strategy.

        Args:
            request: The request that was sent

        Returns:
            Response(status=200): Publishable status was updated.
            Response("User is not authenticated.",
                status=401): if the user is not authenticated
            Response("No notes provided", status=500):
                if the note does not exist.
            Response("Missing title", status=404):
                if the title is missing.
            Response("Strategy not found", status=404):
                if the note does not exist.
            Response("Note not found", status=404):
                if the note does not exist.
        """
        note_ids_ordered = request.data.get("note_ids", [])
        note_ids = set(note_ids_ordered)
        user = cast(CradleUser, request.user)

        if "title" not in request.data:
            Response("Missing title", status=404)

        title = request.data["title"]

        if len(note_ids) == 0:
            return Response("No notes provided", status=500)

        stratname = request.data.get("strategy", None)

        if stratname == "catalyst":
            strategy = CatalystPublish()
        else:  # strategy does not exist
            return Response("Strategy not found", status=404)

        notes = Note.objects.filter(id__in=note_ids)

        found_note_ids = set(map(lambda x: str(x.pk), notes))

        missing_note_ids = note_ids.difference(found_note_ids)

        if len(missing_note_ids) > 0:
            return Response(
                f"Note not found {str(missing_note_ids.pop()).pk}", status=404
            )

        for note in notes:
            if not Access.objects.has_access_to_entities(user):
                return Response(f"Note not found {str(note.pk)}", status=404)

        strategy.publish(title, note_ids_ordered, user)
