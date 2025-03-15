from typing import cast
from uuid import UUID

from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from access.enums import AccessType
from access.models import Access
from entries.enums import EntryType
from user.models import CradleUser

from ..models import Note
from ..serializers import NotePublishSerializer

from drf_spectacular.utils import OpenApiParameter


@extend_schema_view(
    put=extend_schema(
        summary="Update note publishable status",
        description="Updates whether a note is publishable or not. User must have read-write access to all entities referenced in the note.",  # noqa: E501
        parameters=[
            OpenApiParameter(
                name="note_id",
                type=str,
                location=OpenApiParameter.PATH,
                description="UUID of the note to update publishable status",
            )
        ],
        request=NotePublishSerializer,
        responses={
            200: {"description": "Publishable status updated successfully"},
            400: {"description": "Invalid request data"},
            401: {"description": "User is not authenticated"},
            403: {
                "description": "User does not have read-write access to all referenced entities"
            },
            404: {"description": "Note not found"},
        },
    )
)
class NotePublishDetail(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def put(self, request: Request, note_id: UUID) -> Response:
        try:
            note_to_update: Note = Note.objects.get(id=note_id)
        except Note.DoesNotExist:
            return Response("Note not found.", status=status.HTTP_404_NOT_FOUND)

        if not Access.objects.has_access_to_entities(
            cast(CradleUser, request.user),
            set(note_to_update.entries.filter(entry_class__type=EntryType.ENTITY)),
            {AccessType.READ_WRITE},
        ):
            return Response(
                "User does not have Read-Write access to all referenced entities",
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = NotePublishSerializer(note_to_update, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(
                "Publishable status was updated.", status=status.HTTP_200_OK
            )

        return Response("Request body is invalid", status=status.HTTP_400_BAD_REQUEST)
