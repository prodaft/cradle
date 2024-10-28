from rest_framework.response import Response
from rest_framework.request import Request
from rest_framework import status
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema, extend_schema_view
from ..models import Note
from ..serializers import NotePublishSerializer, ReportSerializer, ReportQuerySerializer

from ..exceptions import (
    NoAccessToEntriesException,
)

from ..utils import PublishUtils

from entries.models import Entry
from entries.enums import EntryType
from user.models import CradleUser
from access.models import Access
from access.enums import AccessType

from typing import cast
from uuid import UUID


@extend_schema_view(
    put=extend_schema(
        description="Allow a user to change a Note's publishable status, "
        "from publishable to not publishable or vice versa.",
        responses={
            200: "Publishable status was updated.",
            401: "User is not authenticated.",
            403: "User does not have Read-Write access to the Note.",
            404: "Note not found.",
            400: "Request body is invalid",
        },
        request=NotePublishSerializer,
        summary="Update Note Publishable Status",
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


@extend_schema_view(
    get=extend_schema(
        description="Allows a user to publish a list of notes, in the specified order.",
        responses={
            200: ReportSerializer,
            400: "The query format is invalid.",
            401: "User is not authenticated.",
            403: "The note is not publishable.",
            404: "One of the provided notes does not exist.",
        },
        parameters=[ReportQuerySerializer],
        summary="Publish List of Notes",
    )
)
class NotePublishList(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        query_serializer = ReportQuerySerializer(data=request.query_params)
        query_serializer.is_valid(raise_exception=True)

        required_notes = Note.objects.get_in_order(query_serializer.data["note_ids"])
        referenced_entities = Entry.objects.filter(
            entry_class__type=EntryType.ENTITY, note__in=required_notes
        ).distinct()

        if not Access.objects.has_access_to_entities(
            cast(CradleUser, request.user),
            set(referenced_entities),
            {AccessType.READ, AccessType.READ_WRITE},
        ):
            raise NoAccessToEntriesException(
                "One of the provided notes does not exist."
            )

        return Response(ReportSerializer(PublishUtils.get_report(required_notes)).data)
