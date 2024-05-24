from django.db import transaction
from rest_framework.response import Response
from rest_framework.request import Request
from rest_framework import status
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.permissions import IsAuthenticated
from ..serializers import NoteCreateSerializer, NoteRetrieveSerializer
from ..models import Note

from entities.enums import EntityType

from user.models import Access


class NoteList(APIView):

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request: Request) -> Response:
        """Allow a user to create a new note, by sending the text itself.
        This text should be validated to meet the requirements
        (i.e. reference at least two Entities, one of which must be a Case).

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
        """

        serializer = NoteCreateSerializer(data=request.data)
        if serializer.is_valid():
            note = serializer.save()

            json_note = NoteRetrieveSerializer(note, many=False).data
            return Response(json_note, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class NoteDetail(APIView):

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def delete(self, request: Request, note_id: int) -> Response:
        """Allow a user to delete an already existing note,
        by specifying its id.

        Args:
            request: The request that was sent
            note_id: The id of the note to be deleted.

        Returns:
            Response(status=200): The note was deleted
            Response("User is not authenticated.",
                status=401): if the user is not authenticated
            Response("User does not have Read-Write access to all cases the Note
                    references.", status=403):
                if the user is not the author of the note.
            Response("Note not found", status=404):
                if the note does not exist.
        """
        try:
            note_to_delete = Note.objects.get(id=note_id)
        except Note.DoesNotExist:
            return Response("Note not found.", status=status.HTTP_404_NOT_FOUND)

        referenced_cases = note_to_delete.entities.filter(type=EntityType.CASE)

        if not Access.objects.has_access_to_cases(request.user, referenced_cases):
            return Response(
                "User does not have Read-Write access to all referenced cases",
                status=status.HTTP_403_FORBIDDEN,
            )

        with transaction.atomic():
            note_to_delete.delete()
            Note.objects.delete_unreferenced_entities()

        return Response("Note was deleted.", status=status.HTTP_200_OK)
