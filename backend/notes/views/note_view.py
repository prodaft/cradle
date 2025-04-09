from django.db import transaction
from django.db.models import Q, Count
from rest_framework.response import Response
from rest_framework.request import Request
from rest_framework import status
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.permissions import IsAuthenticated

from core.pagination import TotalPagesPagination
from drf_spectacular.utils import extend_schema, extend_schema_view

from entries.models import Entry

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
        description="Retrieve all notes accessible to the user, with optional pagination.",
        responses={
            200: NoteRetrieveSerializer(many=True),
            400: "Invalid filterset",
            401: "User is not authenticated",
        },
        summary="Get Accessible Notes",
    ),
    post=extend_schema(
        description="Create a new note. Requires referencing at least two entries, "
        "one of which must be an entity, and linking file references to files "
        "uploaded to MinIO.",
        request=NoteCreateSerializer,
        responses={
            200: NoteRetrieveSerializer,
            400: "Invalid request data or minimum references not met",
            401: "User is not authenticated",
            403: "User lacks Read-Write access",
            404: "File reference does not exist",
        },
        summary="Create New Note",
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
            try:
                references_at_least = int(
                    request.query_params.get("references_at_least", len(entrylist))
                )
            except ValueError:
                return Response(
                    "Invalid references_at_least value.",
                    status=status.HTTP_400_BAD_REQUEST,
                )

            queryset = queryset.annotate(
                matching_entries=Count("entries", filter=Q(entries__in=entrylist))
            ).filter(matching_entries=references_at_least)
        elif "linked_to" in request.query_params:
            entryid = request.query_params.get("linked_to")
            entry = Entry.objects.filter(id=entryid)

            if not entry.exists():
                return Response("Entry not found.", status=status.HTTP_404_NOT_FOUND)

            entry = entry.first()
            aliasset = entry.aliasqs(user)
            queryset = queryset.filter(entries__in=aliasset).distinct()

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
        description="Retrieve a specific note by ID if the user has READ access.",
        responses={
            200: NoteRetrieveSerializer,
            401: "User is not authenticated",
            404: "Note not found or access denied",
        },
        summary="Retrieve Note",
    ),
    post=extend_schema(
        description="Edit an existing note by ID. Requires READ access for all entities.",
        request=NoteCreateSerializer,
        responses={
            200: NoteRetrieveSerializer,
            401: "User is not authenticated",
            403: "User cannot edit this note",
            404: "Note not found",
        },
        summary="Edit Note",
    ),
    delete=extend_schema(
        description="Delete a note by ID if the user has Read-Write access.",
        responses={
            200: "Note deleted",
            401: "User is not authenticated",
            403: "User lacks permission",
            404: "Note not found",
        },
        summary="Delete Note",
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

        artifact_ids = set(
            note_to_delete.entries.is_artifact().values_list("id", flat=True)
        )
        note_to_delete.delete()
        Entry.objects.filter(id__in=artifact_ids).unreferenced().delete()

        return Response("Note was deleted.", status=status.HTTP_200_OK)
