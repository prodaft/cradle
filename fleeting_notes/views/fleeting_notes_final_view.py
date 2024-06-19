from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.response import Response
from rest_framework.request import Request
from rest_framework import status
from user.models import CradleUser
from ..models import FleetingNote
from typing import cast
from notes.views.note_view import NoteList
from django.db import transaction
from django.http import QueryDict
from logs.decorators import log_failed_responses

from uuid import UUID


class FleetingNotesFinal(APIView):

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    @log_failed_responses
    def put(self, request: Request, pk: UUID) -> Response:
        """Allow a user to save the contents of a fleeting note as a normal
        note. The user must be the owner of the Fleeting Note. Optionally
        the user can specify if the note is publishable. If not specified,
        the note is not publishable. The fleeting note is deleted after
        the transformation.

        Args:
            request: The request that was sent

        Returns:
            Response(status=200): The newly created Note entity
                if the request was successful.
            Response("Note does not reference at least one Case and two Entities.",
                status=400): if the note does not reference the minimum required
                entities and cases
            Response("User is not authenticated.", status=401):
                if the user is not authenticated
            Response("User does not have Read-Write access
                to a referenced Case or not all Cases exist.", status=404)
            Response("The Fleeting Note does not exist.", status=404):
                if the FleetingNote entity does not exist
        """

        try:
            fleeting_note = FleetingNote.objects.get(
                pk=pk, user=cast(CradleUser, request.user)
            )
        except FleetingNote.DoesNotExist:
            return Response(
                "The Fleeting Note does not exist", status=status.HTTP_404_NOT_FOUND
            )

        if isinstance(request.data, QueryDict):
            request.data._mutable = True
        request.data.update(
            {
                "content": fleeting_note.content,
            }
        )

        with transaction.atomic():
            note_response = NoteList().post(request)
            if note_response.status_code == status.HTTP_200_OK:
                fleeting_note.delete()
            return note_response
