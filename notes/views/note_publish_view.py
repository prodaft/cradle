from rest_framework.response import Response
from rest_framework.request import Request
from rest_framework import status
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.permissions import IsAuthenticated
from ..models import Note
from ..serializers import NotePublishSerializer

from entities.enums import EntityType
from user.models import CradleUser
from access.models import Access
from access.enums import AccessType

from typing import cast


class NotePublishDetail(APIView):

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def put(self, request: Request, note_id: int) -> Response:
        """Allow a user to change a Note's publishable status,
        from publishable to not publishable or vice versa.

        Args:
            request: The request that was sent
            note_id: The id of the note to modify.

        Returns:
            Response(status=200): Publishable status was updated.
            Response("User is not authenticated.",
                status=401): if the user is not authenticated
            Response("User does not have Read-Write access to the Note.", status=403):
                if the user does not have Read-Write access to the Note.
            Response("Note not found", status=404):
                if the note does not exist.
        """
        try:
            note_to_update: Note = Note.objects.get(id=note_id)
        except Note.DoesNotExist:
            return Response("Note not found.", status=status.HTTP_404_NOT_FOUND)

        if not Access.objects.has_access_to_cases(
            cast(CradleUser, request.user),
            set(note_to_update.entities.filter(type=EntityType.CASE)),
            {AccessType.READ_WRITE},
        ):
            return Response(
                "User does not have Read-Write access to all referenced cases",
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = NotePublishSerializer(note_to_update, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(
                "Publishable status was updated.", status=status.HTTP_200_OK
            )

        return Response("Request body is invalid", status=status.HTTP_400_BAD_REQUEST)
