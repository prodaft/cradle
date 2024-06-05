from rest_framework.response import Response
from rest_framework.request import Request
from rest_framework import status
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.permissions import IsAuthenticated
from ..models import Note
from ..serializers import NotePublishSerializer, ReportSerializer, ReportQuerySerializer

from ..exceptions import (
    NoAccessToEntitiesException,
)

from ..utils.publish_utils import PublishUtils

from entities.models import Entity
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


class NotePublishList(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        """Allows a user to publish a list of notes, in the specified order.

        Args:
            request (Request): The HTTP request object containing the query
                parameters and user information.

        Returns:
            Response(status=200): A response object containing the serialized report
                data.
            Response("The query format is invalid.", status=400):
                If the query parameters are invalid.
            Response("User is not authenticated.", status=401):
                If the user is not authenticated.
            Response("The note is not publishable.", status=403):
                If not all provided notes is not publishable.
            Response("One of the provided notes does not exist.", status=404):
                If the user does not have access to one
                or more of the requested notes or no note with
                one of the provided ids exists.
        """

        query_serializer = ReportQuerySerializer(data=request.query_params)

        query_serializer.is_valid(raise_exception=True)

        required_notes = Note.objects.get_in_order(query_serializer.data["note_ids"])
        referenced_cases = Entity.objects.filter(
            type=EntityType.CASE, note__in=required_notes
        ).distinct()

        if not Access.objects.has_access_to_cases(
            cast(CradleUser, request.user),
            set(referenced_cases),
            {AccessType.READ, AccessType.READ_WRITE},
        ):
            raise NoAccessToEntitiesException(
                "One of the provided notes does not exist."
            )

        return Response(ReportSerializer(PublishUtils.get_report(required_notes)).data)
