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


@extend_schema_view(
    put=extend_schema(
        summary="Update Note Publishable Status",
        description="Allow a user to change a Note's publishable status, either to publishable or not publishable.",
        request=NotePublishSerializer,
        responses={
            200: "Successfully updated the note's publishable status.",
            404: "Note does not exist.",
            401: "Unauthorized",
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
