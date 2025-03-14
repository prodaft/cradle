from typing import cast

from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.response import Response
from rest_framework.request import Request
from rest_framework import status

from fleeting_notes.models import FleetingNote
from fleeting_notes.serializers import (
    FleetingNoteTruncatedRetrieveSerializer,
    FleetingNoteSerializer,
)
from user.models import CradleUser

from uuid import UUID

from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiParameter


@extend_schema_view(
    get=extend_schema(
        summary="Get user's fleeting notes",
        description="Returns all fleeting notes belonging to the authenticated user, ordered by last edited date in descending order. Note content is truncated to 200 characters for preview.",
        responses={
            200: FleetingNoteTruncatedRetrieveSerializer(many=True),
            401: {"description": "User is not authenticated"}
        }
    ),
    post=extend_schema(
        summary="Create fleeting note", 
        description="Creates a new fleeting note for the authenticated user.",
        request=FleetingNoteSerializer,
        responses={
            200: FleetingNoteSerializer,
            400: {
                "description": "Invalid request data or file reference bucket name does not match user ID"
            },
            401: {"description": "User is not authenticated"},
            404: {"description": "Referenced file does not exist in MinIO storage"}
        }
    )
)
class FleetingNotesList(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        """
        Get all the FleetingNotes that belong to the authenticated user.
        FleetingNotes are ordered by last_edited in descending order.
        FleetingNotes are truncated to 200 characters for preview.

        Args:
            request: The request that was sent

        Returns:
            Response(serializer.data, status=200):
                The FleetingNotes that belong to the authenticated user
            Response("User is not authenticated.", status=401):
                if the user is not authenticated
        """
        fleeting_notes = FleetingNote.objects.filter(
            user=cast(CradleUser, request.user)
        ).order_by("-last_edited")
        serializer = FleetingNoteTruncatedRetrieveSerializer(fleeting_notes, many=True)
        return Response(serializer.data)

    def post(self, request: Request) -> Response:
        """
        Create a new FleetingNote entry based on the request data.
        The user field is set to correspond to the authenticated user.

        Args:
            request: The request that was sent

        Returns:
            Response(serializer.data, status=200):
                The created FleetingNote entry
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
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema_view(
    get=extend_schema(
        summary="Get fleeting note details",
        description="Returns the full details of a specific fleeting note. Only the owner of the fleeting note can access it.",
        parameters=[
            OpenApiParameter(
                name="pk",
                type=str,
                location=OpenApiParameter.PATH,
                description="UUID of the fleeting note to retrieve"
            )
        ],
        responses={
            200: FleetingNoteSerializer,
            401: {"description": "User is not authenticated"},
            404: {"description": "Fleeting note not found"}
        }
    ),
    put=extend_schema(
        summary="Update fleeting note",
        description="Updates an existing fleeting note. Only the owner of the fleeting note can update it. Content cannot be empty.",
        parameters=[
            OpenApiParameter(
                name="pk", 
                type=str,
                location=OpenApiParameter.PATH,
                description="UUID of the fleeting note to update"
            )
        ],
        request=FleetingNoteSerializer,
        responses={
            200: FleetingNoteSerializer,
            400: {"description": "Invalid request data or empty content"},
            401: {"description": "User is not authenticated"},
            404: {"description": "Fleeting note not found"}
        }
    ),
    delete=extend_schema(
        summary="Delete fleeting note",
        description="Deletes a fleeting note. Only the owner of the fleeting note can delete it.",
        parameters=[
            OpenApiParameter(
                name="pk",
                type=str,
                location=OpenApiParameter.PATH, 
                description="UUID of the fleeting note to delete"
            )
        ],
        responses={
            200: {"description": "Fleeting note deleted successfully"},
            401: {"description": "User is not authenticated"},
            404: {"description": "Fleeting note not found"}
        }
    )
)
class FleetingNotesDetail(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request: Request, pk: UUID) -> Response:
        """
        Get a FleetingNote entry by its primary key.
        Only the owner of the FleetingNote entry can access it.

        Args:
            request: The request that was sent
            pk: The primary key of the FleetingNote entry

        Returns:
            Response(serializer.data, status=200):
                The FleetingNote entry
            Response("The Fleeting Note does not exist", status=404):
                if the FleetingNote entry does not exist
            Response("User is not authenticated.", status=401):
                if the user is not authenticated
                or the user does not own the FleetingNote entry
        """
        try:
            fleeting_note = FleetingNote.objects.get(
                pk=pk, user=cast(CradleUser, request.user)
            )
        except FleetingNote.DoesNotExist:
            return Response(
                "The Fleeting Note does not exist", status=status.HTTP_404_NOT_FOUND
            )

        serializer = FleetingNoteSerializer(fleeting_note)
        return Response(serializer.data)

    def put(self, request: Request, pk: UUID) -> Response:
        """
        Update a FleetingNote entry by its primary key.
        Only the owner of the FleetingNote entry can update it.

        Args:
            request: The request that was sent
            pk: The primary key of the FleetingNote entry

        Returns:
            Response(serializer.data, status=200):
                The updated FleetingNote entry
            Response(serializer.errors, status=400):
                if the request was unsuccessful
            Response("FleetingNote does not exist.", status=404):
                if the FleetingNote entry does not exist
            Response("User is not authenticated.", status=401):
                if the user is not authenticated
                or the user does not own the FleetingNote entry
        """
        data = request.data
        if "content" not in data or not data.get("content"):
            return Response(
                "Content cannot be empty", status=status.HTTP_400_BAD_REQUEST
            )
        try:
            fleeting_note = FleetingNote.objects.get(
                pk=pk, user=cast(CradleUser, request.user)
            )
        except FleetingNote.DoesNotExist:
            return Response(
                "FleetingNote does not exist.", status=status.HTTP_404_NOT_FOUND
            )

        serializer = FleetingNoteSerializer(
            fleeting_note, data=data, context={"request": request}
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request: Request, pk: UUID) -> Response:
        """
        Delete a FleetingNote entry by its primary key.
        Only the owner of the FleetingNote entry can delete it.

        Args:
            request: The request that was sent
            pk: The primary key of the FleetingNote entry

        Returns:
            Response(status=200):
                if the FleetingNote entry was successfully deleted
            Response("FleetingNote does not exist.", status=404):
                if the FleetingNote entry does not exist
            Response("User is not authenticated.", status=401):
                if the user is not authenticated
                or the user does not own the FleetingNote entry
        """
        try:
            fleeting_note = FleetingNote.objects.get(
                pk=pk, user=cast(CradleUser, request.user)
            )
        except FleetingNote.DoesNotExist:
            return Response(
                "FleetingNote does not exist.", status=status.HTTP_404_NOT_FOUND
            )

        fleeting_note.delete()
        return Response(status=status.HTTP_200_OK)
