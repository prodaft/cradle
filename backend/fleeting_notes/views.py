from typing import cast
from uuid import UUID

from django.db import transaction
from django.http import QueryDict
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from core.openapi import get_error_responses, get_common_error_responses, get_validation_error_response
from notes.models import Note
from notes.serializers import (
    FleetingNoteRetrieveSerializer,
    FleetingNoteSerializer,
    NoteCreateSerializer,
    NoteRetrieveSerializer,
)
from user.models import CradleUser
from .exceptions import (
    FleetingNoteNotFoundException,
    EmptyContentException,
    FleetingNotesErrorCodes,
)


@extend_schema_view(
    get=extend_schema(
        summary="Get user's fleeting notes",
        description="Returns all fleeting notes belonging to the authenticated user, ordered by timestamp "
        + "in descending order. Note content is truncated to 200 characters for preview.",
        responses={
            200: FleetingNoteRetrieveSerializer(many=True),
            **get_common_error_responses(),
        },
    ),
    post=extend_schema(
        summary="Create fleeting note",
        description="Creates a new fleeting note for the authenticated user.",
        request=FleetingNoteSerializer,
        responses={
            200: FleetingNoteSerializer,
            **get_validation_error_response(),
            **get_common_error_responses(),
        },
    ),
)
class FleetingNotesList(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        """
        Get all the fleeting notes that belong to the authenticated user.
        Notes are ordered by timestamp in descending order.
        Note content is truncated to 200 characters for preview.

        Args:
            request: The request that was sent

        Returns:
            Response(serializer.data, status=200):
                The fleeting notes that belong to the authenticated user
            Response("User is not authenticated.", status=401):
                if the user is not authenticated
        """
        fleeting_notes = (
            Note.objects.fleeting()
            .filter(author=cast(CradleUser, request.user))
            .order_by("-timestamp")
        )

        serializer = FleetingNoteRetrieveSerializer(
            fleeting_notes, many=True, truncate=200
        )
        return Response(serializer.data)

    def post(self, request: Request) -> Response:
        """
        Create a new fleeting note entry based on the request data.
        The user field is set to correspond to the authenticated user.

        Args:
            request: The request that was sent

        Returns:
            Response(serializer.data, status=200):
                The created fleeting note entry
            Response(serializer.errors, status=400):
                if the request was unsuccessful
            Response("The bucket name of the file reference is incorrect.",
                status=400): if the bucket_name of at least one of the file references
                does not match the user's id
            Response("User is not authenticated.", status=401):
                if the user is not authenticated
            Response("There exists no file at the specified path.", status=404):
                if for at least one of the file references there exists no file at
                that location on the MinIO instance
        """
        serializer = FleetingNoteSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)


@extend_schema_view(
    get=extend_schema(
        summary="Get fleeting note details",
        description="Returns the full details of a specific fleeting note. Only the owner can access it.",
        parameters=[
            OpenApiParameter(
                name="id",
                type=str,
                location=OpenApiParameter.PATH,
                description="UUID of the fleeting note to retrieve",
            )
        ],
        responses={
            200: FleetingNoteSerializer,
            **get_error_responses(FleetingNotesErrorCodes.FLEETING_NOTE_NOT_FOUND),
            **get_common_error_responses(),
        },
    ),
    put=extend_schema(
        summary="Update fleeting note",
        description="Updates an existing fleeting note. Only the owner can update it. Content cannot be empty.",
        parameters=[
            OpenApiParameter(
                name="id",
                type=str,
                location=OpenApiParameter.PATH,
                description="UUID of the fleeting note to update",
            )
        ],
        request=FleetingNoteSerializer,
        responses={
            200: FleetingNoteSerializer,
            **get_error_responses(
                FleetingNotesErrorCodes.EMPTY_CONTENT,
                FleetingNotesErrorCodes.FLEETING_NOTE_NOT_FOUND
            ),
            **get_validation_error_response(),
            **get_common_error_responses(),
        },
    ),
    delete=extend_schema(
        summary="Delete fleeting note",
        description="Deletes a fleeting note. Only the owner can delete it.",
        parameters=[
            OpenApiParameter(
                name="id",
                type=str,
                location=OpenApiParameter.PATH,
                description="UUID of the fleeting note to delete",
            )
        ],
        responses={
            200: {"description": "Fleeting note deleted successfully"},
            **get_error_responses(FleetingNotesErrorCodes.FLEETING_NOTE_NOT_FOUND),
            **get_common_error_responses(),
        },
    ),
)
class FleetingNotesDetail(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request: Request, id: UUID) -> Response:
        """
        Get a fleeting note entry by its primary key.
        Only the owner can access it.

        Args:
            request: The request that was sent
            id: The primary key of the fleeting note entry

        Returns:
            Response(serializer.data, status=200):
                The fleeting note entry
            Response("The fleeting note does not exist", status=404):
                if the fleeting note entry does not exist
            Response("User is not authenticated.", status=401):
                if the user is not authenticated
                or the user does not own the fleeting note entry
        """
        try:
            note = Note.objects.fleeting().get(
                pk=id, author=cast(CradleUser, request.user)
            )
        except Note.DoesNotExist:
            raise FleetingNoteNotFoundException(detail="The fleeting note does not exist")

        serializer = FleetingNoteSerializer(note)
        return Response(serializer.data)

    def put(self, request: Request, id: UUID) -> Response:
        """
        Update a fleeting note entry by its primary key.
        Only the owner can update it.

        Args:
            request: The request that was sent
            id: The primary key of the fleeting note entry

        Returns:
            Response(serializer.data, status=200):
                The updated fleeting note entry
            Response(serializer.errors, status=400):
                if the request was unsuccessful
            Response("Fleeting note does not exist.", status=404):
                if the fleeting note entry does not exist
            Response("User is not authenticated.", status=401):
                if the user is not authenticated
                or the user does not own the fleeting note entry
        """
        data = request.data
        if "content" not in data or not data.get("content"):
            raise EmptyContentException(detail="Content cannot be empty")

        try:
            note = Note.objects.fleeting().get(
                pk=id, author=cast(CradleUser, request.user)
            )
        except Note.DoesNotExist:
            raise FleetingNoteNotFoundException(detail="Fleeting note does not exist")

        serializer = FleetingNoteSerializer(
            note, data=data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status.HTTP_200_OK)

    def delete(self, request: Request, id: UUID) -> Response:
        """
        Delete a fleeting note entry by its primary key.
        Only the owner can delete it.

        Args:
            request: The request that was sent
            id: The primary key of the fleeting note entry

        Returns:
            Response(status=200):
                if the fleeting note entry was successfully deleted
            Response("Fleeting note does not exist.", status=404):
                if the fleeting note entry does not exist
            Response("User is not authenticated.", status=401):
                if the user is not authenticated
                or the user does not own the fleeting note entry
        """
        try:
            note = Note.objects.fleeting().get(
                pk=id, author=cast(CradleUser, request.user)
            )
        except Note.DoesNotExist:
            raise FleetingNoteNotFoundException(detail="Fleeting note does not exist")

        note.delete()
        return Response(status=status.HTTP_200_OK)


@extend_schema_view(
    put=extend_schema(
        summary="Convert fleeting note to regular note",
        description="Converts a fleeting note to a regular note. Only the owner can convert it.",
        parameters=[
            OpenApiParameter(
                name="id",
                type=str,
                location=OpenApiParameter.PATH,
                description="UUID of the fleeting note to convert",
            )
        ],
        request=None,
        responses={
            200: NoteRetrieveSerializer,
            **get_error_responses(FleetingNotesErrorCodes.FLEETING_NOTE_NOT_FOUND),
            **get_validation_error_response(),
            **get_common_error_responses(),
        },
    )
)
class FleetingNotesFinal(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def put(self, request: Request, id: UUID) -> Response:
        """Convert a fleeting note to a regular note. Only the owner can convert it.

        Args:
            request: The request that was sent
            id: The primary key of the fleeting note entry

        Returns:
            Response(status=200): The newly created Note entry
                if the request was successful.
            Response("Note does not reference at least one Entity and two Entries.",
                status=400): if the note does not reference the minimum required
                entries and entities
            Response("User is not authenticated.", status=401):
                if the user is not authenticated
            Response("User does not have Read-Write access
                to a referenced Entity or not all Entities exist.", status=404)
            Response("The fleeting note does not exist.", status=404):
                if the fleeting note entry does not exist
        """
        try:
            note = Note.objects.fleeting().get(
                pk=id, author=cast(CradleUser, request.user)
            )
        except Note.DoesNotExist:
            raise FleetingNoteNotFoundException(detail="The fleeting note does not exist")

        if isinstance(request.data, QueryDict):
            request.data._mutable = True

        # Prepare data for conversion
        note_data = {
            "content": note.content,
            "files": [file.to_dict() for file in note.files.all()],
        }

        with transaction.atomic():
            # Create new note using NoteCreateSerializer for proper processing
            serializer = NoteCreateSerializer(
                data=note_data, context={"request": request}
            )
            serializer.is_valid(raise_exception=True)
            new_note = serializer.save()
            # Delete the fleeting note
            note.delete()
            return Response(
                NoteRetrieveSerializer(new_note).data, status=status.HTTP_200_OK
            )
