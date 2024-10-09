from django.db import transaction
from rest_framework.response import Response
from rest_framework.request import Request
from rest_framework import status
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.permissions import IsAuthenticated
from ..serializers import NoteCreateSerializer, NoteRetrieveSerializer
from ..models import Note
from user.models import CradleUser
from access.enums import AccessType
from typing import cast
from logs.decorators import log_failed_responses

from entries.enums import EntryType
from access.models import Access

from uuid import UUID


class NoteList(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    @log_failed_responses
    def post(self, request: Request) -> Response:
        """Allow a user to create a new note, by sending the text itself.
        This text should be validated to meet the requirements
        (i.e. reference at least two Entries, one of which must be an Entity).
        Moreover, the client should send an array of file references that
        correspond to the files uploaded to MinIO that are linked to this note.

        Args:
            request: The request that was sent

        Returns:
            Response(status=200): The newly created Note entry
                if the request was successful.
            Response("Note does not reference at least one Entity and two Entries.",
                status=400): if the note does not reference the minimum required
                entries and entities
            Response("The bucket name of the file reference is incorrect.",
                status=400): if the bucket_name of at least one of the file references
                does not match the user's id
            Response("User is not authenticated.", status=401):
                if the user is not authenticated
            Response("User does not have Read-Write access
                to a referenced Entity or not all Entities exist.", status=404)
            Response("There exists no file at the specified path.", status=404):
                if for at least one of the file references there exists no file at
                that location on the MinIO instance
        """
        serializer = NoteCreateSerializer(
            data=request.data, context={"request": request}
        )
        if serializer.is_valid():
            note = serializer.save()

            json_note = NoteRetrieveSerializer(note, many=False).data
            return Response(json_note, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class NoteDetail(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    @log_failed_responses
    def get(self, request: Request, note_id: UUID) -> Response:
        """Allow a user to get an already existing note, by specifying
        its id. A user should be able to retrieve the id only if he has
        READ access an all the entities it references.

        Args:
            request: The request that was sent.
            note_id: The id of the note.

        Returns:
            Response(status=200): A JSON response containing note
                if the request was successful
            Response("User is not authenticated.", status=401):
                if the user is not authenticated.
            Response("Note with given id does not exist.", status=404):
                if the user does not have at least READ access on all
                referenced entities, or the note does not exist.
        """
        try:
            note: Note = Note.objects.get(id=note_id)
        except Note.DoesNotExist:
            return Response("Note was not found.", status=status.HTTP_404_NOT_FOUND)

        if not Access.objects.has_access_to_entities(
            cast(CradleUser, request.user),
            set(note.entries.filter(entry_class__type=EntryType.ENTITY)),
            {AccessType.READ, AccessType.READ_WRITE},
        ):
            return Response("Note was not found.", status=status.HTTP_404_NOT_FOUND)

        return Response(NoteRetrieveSerializer(note).data, status=status.HTTP_200_OK)

    @log_failed_responses
    def post(self, request: Request, note_id: UUID) -> Response:
        """Allow a user to edit an already existing note, by specifying
        its id. A user should be able to retrieve the id only if he has
        READ access an all the entities it references.

        Args:
            request: The request that was sent.
            note_id: The id of the note.

        Returns:
            Response(status=200): A JSON response containing note
                if the request was successful
            Response("User is not authenticated.", status=401):
                if the user is not authenticated.
            Response("Note with given id does not exist.", status=404):
                if the user does not have at least READ access on all
                referenced entities, or the note does not exist.
        """
        try:
            note: Note = Note.objects.get(id=note_id)
        except Note.DoesNotExist:
            return Response("Note was not found.", status=status.HTTP_404_NOT_FOUND)

        user = cast(CradleUser, request.user)

        if not Access.objects.has_access_to_entities(
            user,
            set(note.entries.filter(entry_class__type=EntryType.ENTITY)),
            {AccessType.READ, AccessType.READ_WRITE},
        ):
            return Response("Note was not found.", status=status.HTTP_404_NOT_FOUND)

        if not (user.is_superuser or note.author != user):
            return Response(
                "You cannot edit this note", status=status.HTTP_403_FORBIDDEN
            )

        serializer = NoteCreateSerializer(
            note, data=request.data, context={"request": request}
        )

        if serializer.is_valid():
            note = serializer.save()

            json_note = NoteRetrieveSerializer(note, many=False).data
            return Response(json_note, status=status.HTTP_200_OK)

        return Response(NoteRetrieveSerializer(note).data, status=status.HTTP_200_OK)

    @log_failed_responses
    def delete(self, request: Request, note_id: UUID) -> Response:
        """Allow a user to delete an already existing note,
        by specifying its id.

        Args:
            request: The request that was sent
            note_id: The id of the note to be deleted.

        Returns:
            Response(status=200): The note was deleted
            Response("User is not authenticated.",
                status=401): if the user is not authenticated
            Response("User does not have Read-Write access to all entities the Note
                    references.", status=403):
                if the user is not the author of the note.
            Response("Note not found", status=404):
                if the note does not exist.
        """
        try:
            note_to_delete = Note.objects.get(id=note_id)
        except Note.DoesNotExist:
            return Response("Note not found.", status=status.HTTP_404_NOT_FOUND)

        if not Access.objects.has_access_to_entities(
            cast(CradleUser, request.user),
            set(note_to_delete.entries.filter(entry_class__type=EntryType.ENTITY)),
            {AccessType.READ, AccessType.READ_WRITE},
        ):
            return Response(
                "User does not have Read-Write access to all referenced entities",
                status=status.HTTP_403_FORBIDDEN,
            )

        with transaction.atomic():
            note_to_delete.delete()
            Note.objects.delete_unreferenced_entries()

        return Response("Note was deleted.", status=status.HTTP_200_OK)
