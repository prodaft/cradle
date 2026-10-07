"""View for requesting access to the sources/cases of a restricted note."""

from typing import cast
from uuid import UUID

from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from access.models import Access
from access.views.request_access_view import notify_access_request
from core.openapi import get_common_error_responses, get_error_responses
from entries.enums import EntryType
from user.authentication import CookieJWTAuthentication
from user.models import CradleUser

from ..exceptions import NoteNotFoundException, NotesErrorCodes
from ..models import Note


@extend_schema_view(
    post=extend_schema(
        operation_id="notes_access_request_create",
        summary="Request access to a note",
        description=(
            "Requests access to the sources/cases of a published note the user cannot read. Admins and "
            "managers receive a notification for each of those entities; the requester is not told which entities "
            "they are. Only available when restricted note search is enabled. If the user can already read the "
            "note, no notifications are sent but the request is deemed successful."
        ),
        parameters=[
            OpenApiParameter(
                name="note_id",
                type=UUID,
                location=OpenApiParameter.PATH,
                description="ID of the note to request access for",
            ),
        ],
        request=None,
        responses={
            201: {"description": "Access request sent successfully"},
            **get_error_responses(NotesErrorCodes.NOTE_NOT_FOUND),
            **get_common_error_responses(),
        },
    )
)
class RequestNoteAccess(APIView):
    """Request access to the entities of a restricted note; notifies users who can grant it."""

    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request: Request, note_id: UUID) -> Response:
        """Request access to a restricted note's entities. See schema."""
        user = cast(CradleUser, request.user)
        note = Note.objects.non_fleeting().filter(id=note_id).first()
        if note is None or not (user.is_cradle_admin or user.can_see_restricted_notes):
            raise NoteNotFoundException(detail="That note could not be found.")

        if note.has_read_access(user):
            return Response({"detail": "Access request sent successfully."}, status=status.HTTP_201_CREATED)

        missing_entities = note.entries.filter(entry_class__type=EntryType.ENTITY).exclude(
            id__in=Access.objects.get_accessible_entity_ids(user.id)
        )
        label = note.title or str(note.id)
        for entity in missing_entities:
            notify_access_request(
                user,
                entity,
                f'User {user.username} has requested access for entity {entity.name} to read note "{label}"',
            )

        return Response({"detail": "Access request sent successfully."}, status=status.HTTP_201_CREATED)
