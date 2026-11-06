"""Views for sharing a fleeting note with other users."""

from typing import cast
from uuid import UUID

from django.db import transaction
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import status
from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from access.enums import AccessType
from core.exceptions import CoreErrorCodes, InvalidRequestException
from core.openapi import get_common_error_responses, get_error_responses
from core.pagination import TotalPagesPagination
from core.query_lang import search_q
from notifications.models import NoteSharedNotification
from user.authentication import CookieJWTAuthentication
from user.exceptions import UserErrorCodes, UserNotFoundException
from user.models import CradleUser

from ..exceptions import CannotEditNoteException, NoteNotFleetingException, NoteNotFoundException, NotesErrorCodes
from ..models import Note, NoteShare
from ..serializers import NoteShareCandidateSerializer, NoteShareSerializer, NoteShareUpdateSerializer

SHARE_ERRORS = (NotesErrorCodes.NOTE_NOT_FOUND, NotesErrorCodes.NOTE_NOT_FLEETING, NotesErrorCodes.CANNOT_EDIT_NOTE)


def get_shareable_note(user: CradleUser, note_id: UUID, lock: bool = False) -> Note:
    """Return the fleeting note ``user`` wrote, raising if it is missing, published or someone else's."""
    notes = Note.objects.select_for_update() if lock else Note.objects
    note = notes.filter(id=note_id).first()
    if note is None or not note.has_read_access(user):
        raise NoteNotFoundException(detail="That note could not be found.")
    if not note.fleeting:
        raise NoteNotFleetingException()
    if note.author_id != user.id:
        raise CannotEditNoteException(detail="Only the author can share this note.")
    return note


@extend_schema_view(
    get=extend_schema(
        operation_id="notes_shares_list",
        summary="List users a fleeting note is shared with",
        description="Returns the users the note is shared with and their access. Only available to the note's author.",
        responses={
            200: NoteShareSerializer(many=True),
            **get_error_responses(*SHARE_ERRORS),
            **get_common_error_responses(),
        },
    )
)
class NoteShareList(APIView):
    """List the shares of a fleeting note."""

    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request: Request, note_id: UUID) -> Response:
        note = get_shareable_note(cast(CradleUser, request.user), note_id)
        shares = note.shares.select_related("user").order_by("user__username")
        return Response(NoteShareSerializer(shares, many=True).data, status=status.HTTP_200_OK)


@extend_schema_view(
    get=extend_schema(
        operation_id="notes_shares_candidates_list",
        summary="List users a fleeting note can be shared with",
        description=(
            "Returns active users the note is not yet shared with, other than its author. Only available to the "
            "note's author."
        ),
        parameters=[
            OpenApiParameter(
                name="page", type=int, location=OpenApiParameter.QUERY, description="Page number", required=False
            ),
            OpenApiParameter(
                name="page_size", type=int, location=OpenApiParameter.QUERY, description="Page size", required=False
            ),
            OpenApiParameter(
                name="search",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Search users by username",
                required=False,
            ),
        ],
        responses={
            200: TotalPagesPagination().get_paginated_response_serializer(NoteShareCandidateSerializer),
            **get_error_responses(*SHARE_ERRORS, CoreErrorCodes.INVALID_PAGE_SIZE, CoreErrorCodes.PAGE_SIZE_TOO_LARGE),
            **get_common_error_responses(),
        },
    ),
)
class NoteShareCandidates(ListAPIView):
    """Users the author can share a fleeting note with (user listing is otherwise admin-only)."""

    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAuthenticated]
    serializer_class = NoteShareCandidateSerializer
    pagination_class = TotalPagesPagination

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return CradleUser.objects.none()
        note = get_shareable_note(cast(CradleUser, self.request.user), self.kwargs["note_id"])
        users = CradleUser.objects.active().exclude(id=note.author_id).exclude(note_shares__note=note)
        q = search_q(self.request.query_params.get("search"), ["username"])
        if q is not None:
            users = users.filter(q)
        return users.order_by("username")


@extend_schema_view(
    put=extend_schema(
        operation_id="notes_shares_update",
        summary="Share a fleeting note with a user",
        description=(
            "Shares the note with a user at read or read-write access, or stops sharing it with `none`. Read-write "
            "lets them edit the note and upload files to it; deleting, publishing and sharing stay with the author. "
            "Publishing the note removes its shares. Only available to the note's author."
        ),
        request=NoteShareUpdateSerializer,
        responses={
            200: NoteShareUpdateSerializer,
            **get_error_responses(
                *SHARE_ERRORS,
                UserErrorCodes.USER_NOT_FOUND,
                CoreErrorCodes.INVALID_REQUEST,
                include_validation_error=True,
            ),
            **get_common_error_responses(),
        },
    )
)
class NoteShareDetail(APIView):
    """Set or remove a user's share of a fleeting note."""

    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAuthenticated]
    serializer_class = NoteShareUpdateSerializer

    def put(self, request: Request, note_id: UUID, user_id: UUID) -> Response:
        user = cast(CradleUser, request.user)
        serializer = NoteShareUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        access_type = serializer.validated_data["access_type"]

        with transaction.atomic():
            # The lock keeps a concurrent publish from leaving a share on a published note.
            note = get_shareable_note(user, note_id, lock=True)
            target = CradleUser.objects.active().filter(id=user_id).first()
            if target is None:
                raise UserNotFoundException(detail="That user could not be found.")
            if target.id == user.id:
                raise InvalidRequestException(detail="You cannot share a note with yourself.")

            if access_type == AccessType.NONE:
                NoteShare.objects.filter(note=note, user=target).delete()
            elif not NoteShare.objects.filter(note=note, user=target, access_type=access_type).exists():
                NoteShare.objects.update_or_create(note=note, user=target, defaults={"access_type": access_type})
                title = note.title or "Untitled"
                label = str(AccessType(access_type).label)
                NoteSharedNotification.objects.create(
                    user=target,
                    note=note,
                    message=f'{user.username} shared the note "{title}" with you ({label}).',
                )

        return Response({"access_type": access_type}, status=status.HTTP_200_OK)
