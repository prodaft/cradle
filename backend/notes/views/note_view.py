from django.db import transaction
from django.db.models import Q, Count
from rest_framework.response import Response
from rest_framework.request import Request
from rest_framework import status
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.permissions import IsAuthenticated

from core.pagination import TotalPagesPagination
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiParameter

from ..utils import get_guide_note

from ..filters import NoteFilter
from ..serializers import (
    NoteCreateSerializer,
    NoteEditSerializer,
    NoteRetrieveSerializer,
    NoteRetrieveWithLinksSerializer,
)
from ..models import Note
from user.models import CradleUser
from access.enums import AccessType
from typing import cast

from entries.enums import EntryType
from access.models import Access

from uuid import UUID


@extend_schema_view(
    get=extend_schema(
        summary="Get accessible notes",
        description="Returns paginated list of notes that the user has access to. Can filter by references and other parameters. Results are ordered by timestamp descending.",  # noqa: E501
        parameters=[
            OpenApiParameter(
                name="references",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Filter notes by referenced entry IDs",
                many=True,
            ),
            OpenApiParameter(
                name="truncate",
                type=int,
                location=OpenApiParameter.QUERY,
                description="Number of characters to truncate note content to",
                default=200,
            ),
            OpenApiParameter(
                name="page",
                type=int,
                location=OpenApiParameter.QUERY,
                description="Page number for pagination",
            ),
        ],
        responses={
            200: NoteRetrieveSerializer,
            400: {"description": "Invalid filter parameters"},
            401: {"description": "User is not authenticated"},
        },
    ),
    post=extend_schema(
        summary="Create note",
        description="Creates a new note. User must have read-write access to all referenced entities.",  # noqa: E501
        request=NoteCreateSerializer,
        responses={
            200: NoteRetrieveSerializer,
            400: {
                "description": "Invalid request data or insufficient entity references"
            },
            401: {"description": "User is not authenticated"},
            403: {
                "description": "User does not have required access to referenced entities"
            },
        },
    ),
)
class NoteList(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        user = cast(CradleUser, request.user)
        queryset = Note.objects.get_accessible_notes(user)

        if "references" in request.query_params:
            entrylist = request.query_params.getlist("references")
            queryset = queryset.annotate(
                matching_entries=Count("entries", filter=Q(entries__in=entrylist))
            ).filter(matching_entries=len(entrylist))

        filterset = NoteFilter(request.query_params, queryset=queryset)

        if filterset.is_valid():
            notes = filterset.qs.order_by("-timestamp")
            paginator = TotalPagesPagination(page_size=10)
            paginated_notes = paginator.paginate_queryset(notes, request)

            if paginated_notes is not None:
                serializer = NoteRetrieveSerializer(
                    paginated_notes,
                    truncate=int(request.query_params.get("truncate", 200)),
                    many=True,
                )
                return paginator.get_paginated_response(serializer.data)

            serializer = NoteRetrieveSerializer(notes, truncate=200, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        else:
            return Response(filterset.errors, status=status.HTTP_400_BAD_REQUEST)

    def post(self, request: Request) -> Response:
        serializer = NoteCreateSerializer(
            data=request.data, context={"request": request}
        )
        if serializer.is_valid():
            note = serializer.save()
            json_note = NoteRetrieveSerializer(note, many=False).data
            return Response(json_note, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema_view(
    get=extend_schema(
        summary="Get note details",
        description="Returns the full details of a specific note. User must have access to view the note. Can optionally include footnotes.",  # noqa: E501
        parameters=[
            OpenApiParameter(
                name="note_id_s",
                type=str,
                location=OpenApiParameter.PATH,
                description="ID of the note to retrieve. Can be a UUID or a guide note ID starting with 'guide'",
            ),
            OpenApiParameter(
                name="footnotes",
                type=bool,
                location=OpenApiParameter.QUERY,
                description="Whether to include footnotes in response. Defaults to true",
                default=True,
            ),
        ],
        responses={
            200: NoteRetrieveSerializer,
            400: {"description": "Invalid note ID format"},
            401: {"description": "User is not authenticated"},
            404: {"description": "Note not found"},
        },
    ),
    post=extend_schema(
        summary="Update note",
        description="Updates an existing note. User must have read-write access to referenced entities.",  # noqa: E501
        parameters=[
            OpenApiParameter(
                name="note_id_s",
                type=str,
                location=OpenApiParameter.PATH,
                description="ID of the note to update. Must be a valid UUID",
            )
        ],
        responses={
            200: NoteRetrieveSerializer,
            400: {"description": "Invalid note ID format or invalid request data"},
            401: {"description": "User is not authenticated"},
            403: {
                "description": "Cannot edit guide notes or user lacks required permissions"
            },
            404: {"description": "Note not found"},
        },
    ),
)
class NoteDetail(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request: Request, note_id_s: str) -> Response:
        if note_id_s.startswith("guide"):
            note = get_guide_note(note_id_s, request)
            if note is None:
                return Response("Note was not found.", status=status.HTTP_404_NOT_FOUND)

            return Response(
                NoteRetrieveSerializer(note).data, status=status.HTTP_200_OK
            )

        try:
            note_id = UUID(note_id_s)
        except ValueError:
            return Response("Invalid note ID.", status=status.HTTP_400_BAD_REQUEST)

        try:
            note: Note = Note.objects.get_accessible_notes(request.user).get(id=note_id)
        except Note.DoesNotExist:
            return Response("Note was not found.", status=status.HTTP_404_NOT_FOUND)

        if request.query_params.get("footnotes", "true") == "true":
            return Response(
                NoteRetrieveWithLinksSerializer(note).data, status=status.HTTP_200_OK
            )

        return Response(NoteRetrieveSerializer(note).data, status=status.HTTP_200_OK)

    def post(self, request: Request, note_id_s: str) -> Response:
        if note_id_s.startswith("guide"):
            return Response(
                "You cannot edit the guide note!", status=status.HTTP_403_FORBIDDEN
            )

        try:
            note_id = UUID(note_id_s)
        except ValueError:
            return Response("Invalid note ID.", status=status.HTTP_400_BAD_REQUEST)

        try:
            note: Note = Note.objects.get(id=note_id)
        except Note.DoesNotExist:
            return Response("Note was not found.", status=status.HTTP_404_NOT_FOUND)

        user = cast(CradleUser, request.user)

        if not Access.objects.has_access_to_entities(
            user,
            set(note.entries.filter(entry_class__type=EntryType.ENTITY)),
            {AccessType.READ, AccessType.READ_WRITE},
        ):
            return Response("Note was not found.", status=status.HTTP_404_NOT_FOUND)

        if not user.is_cradle_admin and note.author != user:
            return Response(
                "You cannot edit this note", status=status.HTTP_403_FORBIDDEN
            )

        serializer = NoteEditSerializer(
            note, data=request.data, context={"request": request}
        )

        if serializer.is_valid():
            note = serializer.save()
            json_note = NoteRetrieveSerializer(note, many=False).data
            return Response(json_note, status=status.HTTP_200_OK)

        return Response(NoteRetrieveSerializer(note).data, status=status.HTTP_200_OK)

    def delete(self, request: Request, note_id_s: str) -> Response:
        if note_id_s.startswith("guide"):
            return Response(
                "You cannot delete the guide note!", status=status.HTTP_403_FORBIDDEN
            )

        try:
            note_id = UUID(note_id_s)
        except ValueError:
            return Response("Invalid note ID.", status=status.HTTP_400_BAD_REQUEST)

        try:
            note_to_delete = Note.objects.get(id=note_id)
        except Note.DoesNotExist:
            return Response("Note not found.", status=status.HTTP_404_NOT_FOUND)

        if not Access.objects.has_access_to_entities(
            cast(CradleUser, request.user),
            set(note_to_delete.entries.filter(entry_class__type=EntryType.ENTITY)),
            {AccessType.READ, AccessType.READ_WRITE},
        ):
            return Response(
                "User does not have Read-Write access to all referenced entities",
                status=status.HTTP_403_FORBIDDEN,
            )

        with transaction.atomic():
            note_to_delete.delete()
            Note.objects.delete_unreferenced_entries()

        return Response("Note was deleted.", status=status.HTTP_200_OK)
