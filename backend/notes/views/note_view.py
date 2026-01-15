from typing import cast
from uuid import UUID

from django.db import transaction
from django.db.models import Count, Prefetch, Q
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from access.enums import AccessType
from access.models import Access
from core.openapi import (
    get_common_error_responses,
    get_error_responses,
    get_validation_error_response,
)
from core.pagination import TotalPagesPagination
from core.utils import validate_order_by
from entries.enums import EntryType
from entries.models import Entry
from file_transfer.models import FileReference
from knowledge_graph.serializers import SubGraphSerializer
from notes.enums import NoteStatus
from user.models import CradleUser

from ..exceptions import (
    CannotEditNoteException,
    EntryNotFoundException,
    InvalidPageSizeException,
    InvalidReferencesAtLeastException,
    NoAccessToEntriesException,
    NoteDoesNotExistException,
    NotesErrorCodes,
)
from ..filters import NoteFilter
from ..models import Note
from ..serializers import (
    FileReferenceListSerializer,
    FileReferenceWithNoteSerializer,
    FleetingNoteSerializer,
    NoteCreateSerializer,
    NoteEditSerializer,
    NoteListSerializer,
    NoteRetrieveSerializer,
)


@extend_schema_view(
    get=extend_schema(
        operation_id="notes_list",
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
                name="page_size",
                type=int,
                location=OpenApiParameter.QUERY,
                description="Number of notes to return per page. Max 200.",
                default=10,
            ),
            OpenApiParameter(
                name="page",
                type=int,
                location=OpenApiParameter.QUERY,
                description="Page number for pagination",
            ),
            OpenApiParameter(
                name="status",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Filter by note status, finalized covers all statuses except for fleeting",
                enum=list(map(lambda x: x[0], NoteStatus.choices)) + ["fleeting", "finalized"],
            ),
            OpenApiParameter(
                name="date",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Filter by note date (YYYY-MM-DD format)",
                required=False,
            ),
            OpenApiParameter(
                name="linked_to",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Filter notes by being linked to a specific entry",
            ),
            OpenApiParameter(
                name="timestamp_gte",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Filter by timestamp greater than or equal to (ISO datetime format)",
                required=False,
            ),
            OpenApiParameter(
                name="timestamp_lte",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Filter by timestamp less than or equal to (ISO datetime format)",
                required=False,
            ),
            OpenApiParameter(
                name="content",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Filter by note content (case-insensitive partial match)",
                required=False,
            ),
            OpenApiParameter(
                name="author__username",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Filter by author username (case-insensitive partial match)",
                required=False,
            ),
            OpenApiParameter(
                name="order_by",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Order notes by field(s). Prefix with '-' for descending order. Multiple fields can be separated by commas. Valid fields: timestamp, edit_timestamp, title, author__username. Default: -timestamp",  # noqa: E501
                required=False,
                default="-timestamp",
            ),
        ],
        responses={
            200: TotalPagesPagination().get_paginated_response_serializer(NoteRetrieveSerializer),
            **get_error_responses(
                NotesErrorCodes.INVALID_PAGE_SIZE,
                NotesErrorCodes.INVALID_REFERENCES_AT_LEAST,
                NotesErrorCodes.ENTRY_NOT_FOUND,
                NotesErrorCodes.INVALID_REQUEST,
            ),
            **get_common_error_responses(),
        },
    ),
    post=extend_schema(
        operation_id="notes_create",
        summary="Create note",
        description="Creates a new note for the authenticated user.",
        request=FleetingNoteSerializer,
        responses={
            200: FleetingNoteSerializer,
            **get_validation_error_response(),
            **get_common_error_responses(),
        },
    ),
)
class NoteList(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    pagination_class = TotalPagesPagination

    def get(self, request: Request) -> Response:
        user = cast(CradleUser, request.user)
        status_filter = request.query_params.get("status")
        if status_filter == "fleeting":
            queryset = Note.objects.filter(author=user, fleeting=True)
        else:
            queryset = Note.objects.get_accessible_notes(user)
            if status_filter is None:
                author_fleeting = Note.objects.filter(author=user, fleeting=True).distinct()
                queryset = (queryset | author_fleeting).distinct()

        try:
            page_size = int(request.query_params.get("page_size", 10))
        except ValueError:
            raise InvalidPageSizeException(detail="Invalid page_size value. Must be an integer.")

        if page_size > 200:
            raise InvalidPageSizeException(detail="page_size cannot be greater than 200.")

        if "references" in request.query_params:
            entrylist = request.query_params.getlist("references")
            try:
                references_at_least = int(request.query_params.get("references_at_least", len(entrylist)))
            except ValueError:
                raise InvalidReferencesAtLeastException(detail="Invalid references_at_least value.")

            queryset = queryset.annotate(matching_entries=Count("entries", filter=Q(entries__in=entrylist))).filter(
                matching_entries=references_at_least
            )
        elif "linked_to" in request.query_params:
            queryset = queryset.non_fleeting()
            entryid = request.query_params.get("linked_to")
            entry = Entry.objects.filter(id=entryid)

            if not entry.exists():
                raise EntryNotFoundException(detail="Entry not found.")

            entry = entry.first()

            linked_to_exact_match = request.query_params.get("linked_to_exact_match", "false") == "true"

            if linked_to_exact_match:
                queryset = queryset.annotate(
                    entity_count=Count("entries", filter=Q(entries__entry_class__type=EntryType.ENTITY))
                )
                queryset = queryset.filter(entries=entry).filter(entity_count=1)
            else:
                aliasset = entry.aliasqs(user)
                queryset = queryset.filter(entries__in=aliasset).distinct()

        if status_filter == "finalized":
            queryset = queryset.filter(fleeting=False)
        elif status_filter not in (None, "fleeting"):
            queryset = queryset.filter(status=status_filter, fleeting=False)

        filterset = NoteFilter(request.query_params, queryset=queryset)

        if filterset.is_valid():
            notes = filterset.qs

            # Handle ordering
            order_by = request.query_params.get("order_by", "-timestamp")
            valid_order_fields = [
                "timestamp",
                "edit_timestamp",
                "title",
                "author__username",
                "editor__username",
            ]

            # Parse and validate order_by parameter
            order_fields, error_response = validate_order_by(order_by, valid_order_fields)
            if error_response:
                return error_response

            if order_fields:
                notes = notes.order_by(*order_fields)
            else:
                notes = notes.order_by("-timestamp")

            entries_prefetch = Prefetch("entries", queryset=Entry.objects.select_related("entry_class"))

            files_prefetch = Prefetch("files", queryset=FileReference.objects.select_related("note"))

            notes = (
                notes.select_related("author", "editor")
                .prefetch_related(
                    entries_prefetch,
                    files_prefetch,
                )
                .only(
                    "id",
                    "content",
                    "status",
                    "status_message",
                    "status_timestamp",
                    "title",
                    "description",
                    "metadata",
                    "timestamp",
                    "edit_timestamp",
                    "last_linked",
                    "author__id",
                    "author__username",
                    "editor__id",
                    "editor__username",
                )
            )

            paginator = TotalPagesPagination(page_size=page_size)
            paginated_notes = paginator.paginate_queryset(notes, request)

            if paginated_notes is not None:
                serializer = NoteListSerializer(
                    truncate=int(request.query_params.get("truncate", 200)),
                    many=True,
                )
                serialized_data = serializer.to_representation(paginated_notes)
                return paginator.get_paginated_response(serialized_data)

            serializer = NoteListSerializer(truncate=200, many=True)
            return Response(serializer.to_representation(notes), status=status.HTTP_200_OK)
        else:
            from ..exceptions import InvalidRequestException

            raise InvalidRequestException(detail=str(filterset.errors))

    def post(self, request: Request) -> Response:
        """
        Create a new fleeting note based on the request data.
        The user field is set to correspond to the authenticated user.

        Args:
            request: The request that was sent

        Returns:
            Response(serializer.data, status=200):
                The created fleeting note entry
            Response(serializer.errors, status=400):
                if the request was unsuccessful
            Response("User is not authenticated.", status=401):
                if the user is not authenticated
        """
        serializer = FleetingNoteSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)


@extend_schema_view(
    get=extend_schema(
        operation_id="notes_retrieve",
        summary="Get note details",
        description="Returns the full details of a specific note. User must have access to view the note. Can optionally include footnotes.",  # noqa: E501
        parameters=[
            OpenApiParameter(
                name="note_id",
                type=UUID,
                location=OpenApiParameter.PATH,
                description="ID of the note to retrieve.",
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
            **get_error_responses(
                NotesErrorCodes.NOTE_DOES_NOT_EXIST,
            ),
            **get_common_error_responses(),
        },
    ),
    post=extend_schema(
        operation_id="notes_update",
        summary="Update note",
        description="Updates an existing note. User must have read-write access to referenced entities.",  # noqa: E501
        request=NoteEditSerializer,
        parameters=[
            OpenApiParameter(
                name="note_id",
                type=UUID,
                location=OpenApiParameter.PATH,
                description="ID of the note to update. Must be a valid UUID",
            )
        ],
        responses={
            200: NoteRetrieveSerializer,
            **get_validation_error_response(),
            **get_error_responses(
                NotesErrorCodes.NOTE_DOES_NOT_EXIST,
                NotesErrorCodes.CANNOT_EDIT_NOTE,
            ),
            **get_common_error_responses(),
        },
    ),
    delete=extend_schema(
        operation_id="notes_delete",
        summary="Delete note",
        description="Deletes an existing note. User must have read-write access to all referenced entities.",
        parameters=[
            OpenApiParameter(
                name="note_id",
                type=UUID,
                location=OpenApiParameter.PATH,
                description="ID of the note to delete. Must be a valid UUID",
            )
        ],
        responses={
            200: {"description": "Note was deleted successfully"},
            **get_error_responses(
                NotesErrorCodes.NOTE_DOES_NOT_EXIST,
                NotesErrorCodes.NO_ACCESS_TO_ENTRIES,
            ),
            **get_common_error_responses(),
        },
    ),
)
class NoteDetail(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    serializer_class = NoteRetrieveSerializer

    def get(self, request: Request, note_id: UUID) -> Response:
        user = cast(CradleUser, request.user)
        try:
            note = Note.objects.get(id=note_id)
        except Note.DoesNotExist:
            raise NoteDoesNotExistException(detail="Note was not found.")

        if note.fleeting:
            if note.author_id != user.id:
                raise NoteDoesNotExistException(detail="Note was not found.")
        else:
            try:
                note = Note.objects.get_accessible_notes(request.user).get(id=note_id)
            except Note.DoesNotExist:
                raise NoteDoesNotExistException(detail="Note was not found.")

        if request.query_params.get("footnotes", "true") == "true":
            return Response(NoteRetrieveSerializer(note).data, status=status.HTTP_200_OK)

        return Response(NoteRetrieveSerializer(note).data, status=status.HTTP_200_OK)

    def post(self, request: Request, note_id: UUID) -> Response:
        try:
            note: Note = Note.objects.get(id=note_id)
        except Note.DoesNotExist:
            raise NoteDoesNotExistException(detail="Note was not found.")

        user = cast(CradleUser, request.user)

        if not Access.objects.has_access_to_entities(
            user,
            set(note.entries.filter(entry_class__type=EntryType.ENTITY)),
            {AccessType.READ, AccessType.READ_WRITE},
        ):
            raise NoteDoesNotExistException(detail="Note was not found.")

        if not user.is_cradle_admin and note.author != user:
            raise CannotEditNoteException(detail="You cannot edit this note")

        serializer = NoteEditSerializer(note, data=request.data, context={"request": request})

        serializer.is_valid(raise_exception=True)
        note = serializer.save()
        json_note = NoteRetrieveSerializer(note, many=False).data
        return Response(json_note, status=status.HTTP_200_OK)

    def delete(self, request: Request, note_id: UUID) -> Response:
        from entries.tasks import refresh_edges_materialized_view

        try:
            note_to_delete = Note.objects.get(id=note_id)
        except Note.DoesNotExist:
            raise NoteDoesNotExistException(detail="Note not found.")

        if note_to_delete.fleeting:
            if note_to_delete.author_id != request.user.id:
                raise NoteDoesNotExistException(detail="Note not found.")
        else:
            if not Access.objects.has_access_to_entities(
                cast(CradleUser, request.user),
                set(note_to_delete.entries.filter(entry_class__type=EntryType.ENTITY)),
                {AccessType.READ, AccessType.READ_WRITE},
            ):
                raise NoAccessToEntriesException(
                    detail="User does not have Read-Write access to all referenced entities",
                    links=list(note_to_delete.entries.filter(entry_class__type=EntryType.ENTITY)),
                )
        note_to_delete.delete()

        refresh_edges_materialized_view.apply_async()

        return Response("Note was deleted.", status=status.HTTP_200_OK)


@extend_schema_view(
    put=extend_schema(
        summary="Convert fleeting note to regular note",
        description="Converts a fleeting note to a regular note. Only the owner can convert it.",
        parameters=[
            OpenApiParameter(
                name="note_id",
                type=str,
                location=OpenApiParameter.PATH,
                description="UUID of the fleeting note to convert",
            )
        ],
        request=None,
        responses={
            200: NoteRetrieveSerializer,
            **get_error_responses(NotesErrorCodes.NOTE_DOES_NOT_EXIST),
            **get_validation_error_response(),
            **get_common_error_responses(),
        },
    )
)
class NoteFinalize(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def put(self, request: Request, note_id: UUID) -> Response:
        try:
            note = Note.objects.get(id=note_id, author=request.user, fleeting=True)
        except Note.DoesNotExist:
            raise NoteDoesNotExistException(detail="Note was not found.")

        note_data = {
            "content": note.content,
            "files": [file.to_dict() for file in note.files.all()],
        }

        with transaction.atomic():
            serializer = NoteCreateSerializer(data=note_data, context={"request": request})
            serializer.is_valid(raise_exception=True)
            new_note = serializer.save()
            note.delete()
            return Response(NoteRetrieveSerializer(new_note).data, status=status.HTTP_200_OK)


@extend_schema_view(
    get=extend_schema(
        summary="Get files from accessible notes",
        description="Returns paginated list of files that are linked to notes the user has access to. Can filter by references and other parameters. Results are ordered by note timestamp descending.",  # noqa: E501
        parameters=[
            OpenApiParameter(
                name="references",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Filter notes by referenced entry IDs",
                many=True,
            ),
            OpenApiParameter(
                name="linked_to",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Filter notes by being linked to a specific entry",
            ),
            OpenApiParameter(
                name="page_size",
                type=int,
                location=OpenApiParameter.QUERY,
                description="Number of files to return per page. Max 200.",
                default=10,
            ),
            OpenApiParameter(
                name="keyword",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Filter files by keyword in filename or exact match in hash",
            ),
            OpenApiParameter(
                name="mimetype",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Filter files by wildcard match with mimetype",
            ),
            OpenApiParameter(
                name="date",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Filter notes by date (YYYY-MM-DD format)",
                required=False,
            ),
            OpenApiParameter(
                name="timestamp_gte",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Filter notes by timestamp greater than or equal to (ISO datetime format)",
                required=False,
            ),
            OpenApiParameter(
                name="timestamp_lte",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Filter notes by timestamp less than or equal to (ISO datetime format)",
                required=False,
            ),
            OpenApiParameter(
                name="page",
                type=int,
                location=OpenApiParameter.QUERY,
                description="Page number for pagination",
            ),
            OpenApiParameter(
                name="order_by",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Order files by field(s). Prefix with '-' for descending order. Multiple fields can be separated by commas. Valid fields: timestamp, file_name, mimetype. Default: -timestamp",  # noqa: E501
                required=False,
                default="-timestamp",
            ),
        ],
        responses={
            200: TotalPagesPagination().get_paginated_response_serializer(FileReferenceWithNoteSerializer),
            **get_error_responses(
                NotesErrorCodes.INVALID_PAGE_SIZE,
                NotesErrorCodes.INVALID_REFERENCES_AT_LEAST,
                NotesErrorCodes.ENTRY_NOT_FOUND,
            ),
            **get_common_error_responses(),
        },
    ),
)
class NoteFiles(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        user = cast(CradleUser, request.user)
        queryset = Note.objects.get_accessible_notes(user)

        try:
            page_size = int(request.query_params.get("page_size", 10))
        except ValueError:
            raise InvalidPageSizeException(detail="Invalid page_size value. Must be an integer.")

        if page_size > 200:
            raise InvalidPageSizeException(detail="page_size cannot be greater than 200.")

        if "references" in request.query_params:
            entrylist = request.query_params.getlist("references")
            try:
                references_at_least = int(request.query_params.get("references_at_least", len(entrylist)))
            except ValueError:
                raise InvalidReferencesAtLeastException(detail="Invalid references_at_least value.")
            queryset = queryset.annotate(matching_entries=Count("entries", filter=Q(entries__in=entrylist))).filter(
                matching_entries=references_at_least
            )
        elif "linked_to" in request.query_params:
            entryid = request.query_params.get("linked_to")
            entry = Entry.objects.filter(id=entryid)
            if not entry.exists():
                raise EntryNotFoundException(detail="Entry not found.")
            entry = entry.first()
            linked_to_exact_match = request.query_params.get("linked_to_exact_match", "false") == "true"
            if linked_to_exact_match:
                queryset = queryset.annotate(
                    entity_count=Count("entries", filter=Q(entries__entry_class__type=EntryType.ENTITY))
                )
                queryset = queryset.filter(entries=entry).filter(entity_count=1)
            else:
                aliasset = entry.aliasqs(user)
                queryset = queryset.filter(entries__in=aliasset).distinct()

        # Apply date filters using NoteFilter
        filterset = NoteFilter(request.query_params, queryset=queryset)
        if filterset.is_valid():
            queryset = filterset.qs

        notes_prefetch = Prefetch(
            "files",
            queryset=FileReference.objects.select_related("note").prefetch_related("note__entries__entry_class"),
        )

        notes = queryset.prefetch_related(notes_prefetch)

        files = (
            FileReference.objects.filter(note__in=notes)
            .select_related("note")
            .prefetch_related("note__entries__entry_class")
            .distinct()
        )

        # Filter by keyword (contains match with filename or exact match with hash)
        if "keyword" in request.query_params:
            keyword = request.query_params.get("keyword")
            files = files.filter(
                Q(file_name__contains=keyword) | Q(md5_hash=keyword) | Q(sha256_hash=keyword) | Q(sha1_hash=keyword)
            )

        # Filter by mimetype (wildcard match)
        if "mimetype" in request.query_params and request.query_params["mimetype"]:
            mimetype = request.query_params.get("mimetype")
            # Convert wildcard pattern to regex pattern
            mimetype_pattern = mimetype.replace("*", ".*")
            files = files.filter(mimetype__regex=mimetype_pattern)

        # Handle ordering
        order_by = request.query_params.get("order_by", "-timestamp")
        valid_order_fields = [
            "timestamp",
            "file_name",
            "mimetype",
            "note__timestamp",
            "file_size",
        ]

        # Parse and validate order_by parameter
        order_fields, error_response = validate_order_by(order_by, valid_order_fields)
        if error_response:
            return error_response

        if order_fields:
            files = files.order_by(*order_fields)
        else:
            files = files.order_by("-timestamp")

        paginator = TotalPagesPagination(page_size=page_size)
        paginated_files = paginator.paginate_queryset(files, request)
        if paginated_files is not None:
            serializer = FileReferenceListSerializer(many=True)
            serialized_data = serializer.to_representation(paginated_files)
            return paginator.get_paginated_response(serialized_data)
        serializer = FileReferenceListSerializer(many=True)
        return Response(serializer.to_representation(files), status=status.HTTP_200_OK)


@extend_schema_view(
    get=extend_schema(
        summary="Get subgraph formed by note",
        description="Returns the full subgraph formed by a single note the user has access to.",  # noqa: E501
        parameters=[
            OpenApiParameter(
                name="note_id",
                type=UUID,
                location=OpenApiParameter.PATH,
                description="The note's id",
            ),
        ],
        responses={
            200: SubGraphSerializer,
            **get_error_responses(NotesErrorCodes.NOTE_DOES_NOT_EXIST),
            **get_common_error_responses(),
        },
    ),
)
class NoteGraph(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request: Request, note_id: UUID) -> Response:
        try:
            note: Note = Note.objects.get_accessible_notes(request.user).get(id=note_id)
        except Note.DoesNotExist:
            raise NoteDoesNotExistException(detail="Note was not found.")

        # Get all relations for this note, filtered by user access
        rels = note.relations.accessible(user=request.user)

        # Check if there are any relations
        if not rels.exists():
            # Return empty graph with helpful message
            return Response(
                {
                    "entries": {},
                    "relations": [],
                    "colors": {},
                    "message": "This note has no graph relations or all relations are inaccessible.",
                },
                status=status.HTTP_200_OK,
            )

        serializer = SubGraphSerializer.from_relations(rels.all())
        return Response(serializer.data, status=status.HTTP_200_OK)
