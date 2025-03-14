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
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiParameter

from uuid import UUID


@extend_schema_view(
    put=extend_schema(
        summary="Convert fleeting note to note",
        description="Converts a fleeting note to a regular note. The user must be the owner of the fleeting note. The fleeting note is deleted after conversion. Optionally specify if the note is publishable - defaults to not publishable if unspecified.",
        parameters=[
            OpenApiParameter(
                name="pk",
                type=str,
                location=OpenApiParameter.PATH,
                description="UUID of the fleeting note to convert"
            )
        ],
        responses={
            200: {"description": "Note created successfully"},
            400: {
                "description": "Note does not meet minimum reference requirements or has invalid file references"
            },
            401: {"description": "User is not authenticated"},
            403: {"description": "User does not own the fleeting note"},
            404: {
                "description": "Fleeting note not found, referenced entities don't exist, or file references are invalid"
            }
        }
    )
)
class FleetingNotesFinal(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def put(self, request: Request, pk: UUID) -> Response:
        """Allow a user to save the contents of a fleeting note as a normal
        note. The user must be the owner of the Fleeting Note. Optionally
        the user can specify if the note is publishable. If not specified,
        the note is not publishable. The fleeting note is deleted after
        the transformation.

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
            Response("The Fleeting Note does not exist.", status=404):
                if the FleetingNote entry does not exist
            Response("There exists no file at the specified path.", status=404):
                if for at least one of the file references there exists no file at
                that location on the MinIO instance
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
                "files": [
                    fleeting_note.to_dict()
                    for fleeting_note in fleeting_note.files.all()
                ],
            }
        )

        with transaction.atomic():
            note_response = NoteList().post(request)
            if note_response.status_code == status.HTTP_200_OK:
                fleeting_note.delete()
            return note_response
