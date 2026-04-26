"""Note list, detail, finalize, files, and graph API views."""

import re
from typing import cast
from uuid import UUID

from django.contrib.contenttypes.models import ContentType
from django.db import transaction
from django.db.models import Count, Prefetch, Q
from django.urls import reverse
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import status
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from access.enums import AccessType
from access.models import Access
from core.exceptions import CoreErrorCodes
from core.openapi import get_common_error_responses, get_error_responses
from core.pagination import TotalPagesPagination
from core.utils import validate_order_by
from core.validators import validate_choice_param, validate_int_list_param, validate_int_param
from entries.enums import EntryType
from entries.exceptions import EntriesErrorCodes, EntryNotFoundException
from entries.models import Entry, Relation
from entries.tasks import refresh_edges_materialized_view
from file_transfer.models import FileReference
from knowledge_graph.serializers import SubGraphSerializer
from user.models import CradleUser
from user.permissions import HasAdminRole

from ..enums import NoteStatus
from ..exceptions import (
    CannotEditNoteException,
    InvalidReferenceCountException,
    NoAccessToEntriesException,
    NoteIsEmptyException,
    NoteNotFoundException,
    NotesErrorCodes,
)
from ..filters import NoteFilter
from ..models import Note
from ..processor.connect_aliases_task import AliasConnectionTask
from ..processor.entry_class_creation_task import EntryClassCreationTask
from ..processor.entry_population_task import EntryPopulationTask
from ..processor.finalize_note_task import FinalizeNoteTask
from ..processor.link_files_task import LinkFilesTask
from ..processor.metadata_process_task import MetadataProcessTask
from ..processor.smart_linker_task import SmartLinkerTask
from ..processor.task_scheduler import TaskScheduler
from ..serializers import (
    FileReferenceListSerializer,
    FileReferenceWithNoteSerializer,
    FleetingNoteSerializer,
    NoteEditSerializer,
    NoteListResponseSerializer,
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
                name="edit_timestamp_gte",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Filter by edit_timestamp (last edited) greater than or equal to (ISO datetime format)",
                required=False,
            ),
            OpenApiParameter(
                name="edit_timestamp_lte",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Filter by edit_timestamp (last edited) less than or equal to (ISO datetime format)",
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
                description="Order notes by field(s). Prefix with '-' for descending order. Multiple fields can be separated by commas. Valid fields: timestamp, edit_timestamp, title, author__username, editor__username. Default: -timestamp",  # noqa: E501
                required=False,
                default="-timestamp",
            ),
            OpenApiParameter(
                name="any_field",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Filter with an or over all fields (case-insensitive partial match)",
                required=False,
            ),
        ],
        responses={
            200: TotalPagesPagination().get_paginated_response_serializer(NoteListResponseSerializer),
            **get_error_responses(
                CoreErrorCodes.INVALID_PAGE_SIZE,
                CoreErrorCodes.PAGE_SIZE_TOO_LARGE,
                NotesErrorCodes.INVALID_REFERENCE_COUNT,
                EntriesErrorCodes.ENTRY_NOT_FOUND,
                CoreErrorCodes.INVALID_REQUEST,
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
            201: FleetingNoteSerializer,
            **get_error_responses(include_validation_error=True),
            **get_common_error_responses(),
        },
    ),
)
class NoteList(APIView):
    """List and create notes; supports filtering and pagination."""

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    pagination_class = TotalPagesPagination

    def get(self, request: Request) -> Response:
        user = cast(CradleUser, request.user)
        status_filter = validate_choice_param(
            request.query_params.get("status"),
            ["fleeting", "finalized"] + [c[0] for c in NoteStatus.choices],
            param_name="status",
        )
        if status_filter == "fleeting":
            queryset = Note.objects.filter(author=user, fleeting=True)
        else:
            queryset = Note.objects.get_accessible_notes(user)
            if status_filter is None:
                author_fleeting = Note.objects.filter(author=user, fleeting=True).distinct()
                queryset = (queryset | author_fleeting).distinct()

        if "references" in request.query_params:
            entrylist = request.query_params.getlist("references")
            entry_ids = validate_int_list_param(entrylist, param_name="references")
            references_at_least = validate_int_param(
                request.query_params.get("references_at_least"),
                param_name="references_at_least",
                default=len(entry_ids),
            )
            if references_at_least < 1 or references_at_least > len(entry_ids):
                raise InvalidReferenceCountException()

            queryset = queryset.annotate(matching_entries=Count("entries", filter=Q(entries__in=entry_ids))).filter(
                matching_entries=references_at_least
            )
        elif "linked_to" in request.query_params:
            queryset = queryset.non_fleeting()
            entryid = validate_int_param(
                request.query_params.get("linked_to"),
                param_name="linked_to",
            )
            try:
                entry = Entry.objects.get(id=entryid)
            except Entry.DoesNotExist:
                raise EntryNotFoundException(detail="That entry could not be found.")
            if entry.entry_class.type == EntryType.ENTITY and not (
                user.is_cradle_admin
                or Access.objects.has_access_to_entities(user, {entry}, {AccessType.READ, AccessType.READ_WRITE})
            ):
                raise EntryNotFoundException(detail="That entry could not be found.")

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
        elif status_filter and status_filter != "fleeting":
            queryset = queryset.filter(status=status_filter, fleeting=False)

        if "any_field" in request.query_params:
            queryset = queryset.filter(
                Q(content__icontains=request.query_params.get("any_field"))
                | Q(title__icontains=request.query_params.get("any_field"))
                | Q(author__username__icontains=request.query_params.get("any_field"))
                | Q(editor__username__icontains=request.query_params.get("any_field"))
            )

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
            order_fields = validate_order_by(order_by, valid_order_fields)
            if order_fields:
                notes = notes.order_by(*order_fields)
            else:
                notes = notes.order_by("-timestamp")

            truncate = validate_int_param(
                request.query_params.get("truncate"),
                param_name="truncate",
                default=200,
            )

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

            paginator = self.pagination_class()
            page = paginator.paginate_queryset(notes, request)
            serializer = NoteListSerializer(truncate=truncate, many=True)
            serialized_data = serializer.to_representation(page)
            return paginator.get_paginated_response(serialized_data)
        else:
            raise DRFValidationError(filterset.errors)

    def post(self, request: Request) -> Response:
        """Create a new fleeting note from request data.

        User field is set to the authenticated user.

        Args:
            request: The request that was sent.

        Returns:
            Response with the created fleeting note (201 Created).

        Raises:
            ValidationError: If request validation fails (via exception handler).
        """
        serializer = FleetingNoteSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            serializer.save()
        location = request.build_absolute_uri(reverse("note_detail", kwargs={"note_id": serializer.instance.id}))
        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED,
            headers={"Location": location},
        )


@extend_schema_view(
    get=extend_schema(
        operation_id="notes_retrieve",
        summary="Get note details",
        description="Returns the full details of a specific note. User must have access to view the note.",
        parameters=[
            OpenApiParameter(
                name="note_id",
                type=UUID,
                location=OpenApiParameter.PATH,
                description="ID of the note to retrieve.",
            ),
        ],
        responses={
            200: NoteRetrieveSerializer,
            **get_error_responses(
                NotesErrorCodes.NOTE_NOT_FOUND,
            ),
            **get_common_error_responses(),
        },
    ),
    patch=extend_schema(
        operation_id="notes_update",
        summary="Update note",
        description="Updates an existing note. User must have note write permission (author/admin and read-write access to referenced entities).",  # noqa: E501
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
            **get_error_responses(
                NotesErrorCodes.NOTE_NOT_FOUND,
                NotesErrorCodes.CANNOT_EDIT_NOTE,
                include_validation_error=True,
            ),
            **get_common_error_responses(),
        },
    ),
    delete=extend_schema(
        operation_id="notes_delete",
        summary="Delete note",
        description="Deletes an existing note. User must have note write permission (author/admin and read-write access to referenced entities).",
        parameters=[
            OpenApiParameter(
                name="note_id",
                type=UUID,
                location=OpenApiParameter.PATH,
                description="ID of the note to delete. Must be a valid UUID",
            )
        ],
        responses={
            204: {"description": "Note was deleted successfully"},
            **get_error_responses(
                NotesErrorCodes.NOTE_NOT_FOUND,
                NotesErrorCodes.NO_ACCESS_TO_ENTRIES,
            ),
            **get_common_error_responses(),
        },
    ),
)
class NoteDetail(APIView):
    """Retrieve, update, or delete a single note."""

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    serializer_class = NoteRetrieveSerializer

    def get(self, request: Request, note_id: UUID) -> Response:
        user = cast(CradleUser, request.user)
        try:
            note = Note.objects.get_accessible_notes(user).get(id=note_id)
        except Note.DoesNotExist:
            try:
                note = Note.objects.get(id=note_id)
            except Note.DoesNotExist:
                raise NoteNotFoundException(detail="That note could not be found.")
            if not note.has_read_access(user):
                raise NoteNotFoundException(detail="That note could not be found.")

        return Response(
            NoteRetrieveSerializer(note, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )

    def patch(self, request: Request, note_id: UUID) -> Response:
        try:
            note: Note = Note.objects.get(id=note_id)
        except Note.DoesNotExist:
            raise NoteNotFoundException(detail="That note could not be found.")

        user = cast(CradleUser, request.user)

        if not note.has_read_access(user):
            raise NoteNotFoundException(detail="That note could not be found.")

        if not note.has_write_access(user):
            raise CannotEditNoteException(detail="You do not have permission to edit this note.")

        serializer = NoteEditSerializer(note, data=request.data, context={"request": request})

        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            note = serializer.save()
        json_note = NoteRetrieveSerializer(note, context={"request": request}).data
        return Response(json_note, status=status.HTTP_200_OK)

    def delete(self, request: Request, note_id: UUID) -> Response:
        try:
            note_to_delete = Note.objects.get(id=note_id)
        except Note.DoesNotExist:
            raise NoteNotFoundException(detail="That note could not be found.")

        user = cast(CradleUser, request.user)
        if not note_to_delete.has_read_access(user):
            raise NoteNotFoundException(detail="That note could not be found.")
        if not note_to_delete.has_write_access(user):
            raise NoAccessToEntriesException(
                list(note_to_delete.entries.filter(entry_class__type=EntryType.ENTITY)),
            )
        with transaction.atomic():
            note_to_delete.delete()

        refresh_edges_materialized_view.apply_async()

        return Response(status=status.HTTP_204_NO_CONTENT)


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
            **get_error_responses(
                NotesErrorCodes.NOTE_NOT_FOUND,
                NotesErrorCodes.NOTE_IS_EMPTY,
            ),
            **get_common_error_responses(),
        },
    )
)
class NoteFinalize(APIView):
    """Convert a fleeting note to a regular note (triggers processing pipeline)."""

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def put(self, request: Request, note_id: UUID) -> Response:
        try:
            note = Note.objects.get(id=note_id, author=request.user, fleeting=True)
        except Note.DoesNotExist:
            raise NoteNotFoundException(detail="That note could not be found.")

        if not note.content:
            raise NoteIsEmptyException()

        with transaction.atomic():
            note.fleeting = False
            finalized_note = TaskScheduler(request.user).run_pipeline(note)
        return Response(
            NoteRetrieveSerializer(finalized_note, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )


@extend_schema_view(
    post=extend_schema(
        operation_id="notes_relink",
        summary="Relink a single note",
        description="Re-run the note processing pipeline (entry creation, linking, metadata) for this note. Admin only.",
        parameters=[
            OpenApiParameter(
                name="note_id",
                type=UUID,
                location=OpenApiParameter.PATH,
                description="ID of the note to relink.",
            ),
        ],
        request=None,
        responses={
            200: NoteRetrieveSerializer,
            **get_error_responses(NotesErrorCodes.NOTE_NOT_FOUND),
            **get_common_error_responses(),
        },
    )
)
class NoteRelink(APIView):
    """Re-run note processing pipeline for a single note. Admin only."""

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, HasAdminRole]
    serializer_class = NoteRetrieveSerializer

    def post(self, request: Request, note_id: UUID) -> Response:
        try:
            note = Note.objects.get(id=note_id)
        except Note.DoesNotExist:
            raise NoteNotFoundException(detail="That note could not be found.")

        if note.fleeting:
            raise CannotEditNoteException(detail="Quick notes cannot be relinked.")

        Relation.objects.filter(
            content_type=ContentType.objects.get_for_model(Note),
            object_id=note_id,
        ).delete()

        scheduler = TaskScheduler(
            cast(CradleUser, request.user),
            tasks=[
                EntryClassCreationTask,
                EntryPopulationTask,
                SmartLinkerTask,
                LinkFilesTask,
                MetadataProcessTask,
                AliasConnectionTask,
                FinalizeNoteTask,
            ],
        )
        relinked_note = scheduler.run_pipeline(note, update_acvec=False)

        return Response(
            NoteRetrieveSerializer(relinked_note, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )


@extend_schema_view(
    post=extend_schema(
        operation_id="notes_relink_all",
        summary="Relink all notes",
        description="Re-run the note processing pipeline for all non-fleeting notes. Admin only.",
        request=None,
        responses={
            200: {"description": "Relinking completed."},
            **get_common_error_responses(),
        },
    )
)
class NoteRelinkAll(APIView):
    """Re-run note processing pipeline for all non-fleeting notes. Admin only."""

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, HasAdminRole]

    def post(self, request: Request) -> Response:
        notes = list(Note.objects.non_fleeting())
        Relation.objects.filter(content_type=ContentType.objects.get_for_model(Note)).delete()

        scheduler = TaskScheduler(
            cast(CradleUser, request.user),
            tasks=[
                EntryClassCreationTask,
                EntryPopulationTask,
                SmartLinkerTask,
                LinkFilesTask,
                MetadataProcessTask,
                AliasConnectionTask,
                FinalizeNoteTask,
            ],
        )
        for note in notes:
            scheduler.run_pipeline(note, update_acvec=False)

        return Response(
            {"detail": f"Relinked {len(notes)} notes."},
            status=status.HTTP_200_OK,
        )


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
                description="Filter files by mimetype (case-insensitive partial match)",
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
                description="Order files by field(s). Prefix with '-' for descending order. Multiple fields can be separated by commas. Valid fields: timestamp, file_name, mimetype, note__timestamp, file_size. Default: -timestamp",  # noqa: E501
                required=False,
                default="-timestamp",
            ),
            OpenApiParameter(
                name="any_field",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Filter with an or over all fields (case-insensitive partial match)",
                required=False,
            ),
            OpenApiParameter(
                name="status",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Filter files by status: 'healthy' (has sha256 hash) or 'warning' (missing sha256 hash)",
                required=False,
            ),
        ],
        responses={
            200: TotalPagesPagination().get_paginated_response_serializer(FileReferenceWithNoteSerializer),
            **get_error_responses(
                CoreErrorCodes.INVALID_PAGE_SIZE,
                CoreErrorCodes.PAGE_SIZE_TOO_LARGE,
                CoreErrorCodes.INVALID_REQUEST,
                NotesErrorCodes.INVALID_REFERENCE_COUNT,
                EntriesErrorCodes.ENTRY_NOT_FOUND,
            ),
            **get_common_error_responses(),
        },
    ),
)
class NoteFiles(APIView):
    """List files from accessible notes with filtering."""

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    pagination_class = TotalPagesPagination

    def get(self, request: Request) -> Response:
        user = cast(CradleUser, request.user)
        queryset = Note.objects.get_accessible_notes(user)

        if "references" in request.query_params:
            entrylist = request.query_params.getlist("references")
            entry_ids = validate_int_list_param(entrylist, param_name="references")
            references_at_least = validate_int_param(
                request.query_params.get("references_at_least"),
                param_name="references_at_least",
                default=len(entry_ids),
            )
            if references_at_least < 1 or references_at_least > len(entry_ids):
                raise InvalidReferenceCountException()
            queryset = queryset.annotate(matching_entries=Count("entries", filter=Q(entries__in=entry_ids))).filter(
                matching_entries=references_at_least
            )
        elif "linked_to" in request.query_params:
            queryset = queryset.non_fleeting()
            entryid = validate_int_param(
                request.query_params.get("linked_to"),
                param_name="linked_to",
            )
            try:
                entry = Entry.objects.get(id=entryid)
            except Entry.DoesNotExist:
                raise EntryNotFoundException(detail="That entry could not be found.")
            if entry.entry_class.type == EntryType.ENTITY and not (
                user.is_cradle_admin
                or Access.objects.has_access_to_entities(user, {entry}, {AccessType.READ, AccessType.READ_WRITE})
            ):
                raise EntryNotFoundException(detail="That entry could not be found.")
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
        else:
            raise DRFValidationError(filterset.errors)

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
                Q(file_name__contains=keyword)
                | Q(md5_hash=keyword)
                | Q(sha256_hash=keyword)
                | Q(sha1_hash=keyword)
                | Q(mimetype__icontains=keyword)
            )

        # Filter by mimetype (wildcard match)
        if "mimetype" in request.query_params and request.query_params["mimetype"]:
            mimetype = request.query_params.get("mimetype")
            # Convert wildcard pattern to regex: * = .*, other chars escaped to prevent injection
            parts = mimetype.split("*")
            mimetype_pattern = ".*".join(re.escape(p) for p in parts)
            files = files.filter(mimetype__regex=mimetype_pattern)

        # Filter by status (healthy = has sha256 hash, warning = missing sha256 hash)
        status_filter = validate_choice_param(
            request.query_params.get("status"),
            ["healthy", "warning"],
            param_name="status",
        )
        if status_filter == "healthy":
            files = files.filter(sha256_hash__isnull=False).exclude(sha256_hash="")
        elif status_filter == "warning":
            files = files.filter(Q(sha256_hash__isnull=True) | Q(sha256_hash=""))

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
        order_fields = validate_order_by(order_by, valid_order_fields)
        if order_fields:
            files = files.order_by(*order_fields)
        else:
            files = files.order_by("-timestamp")

        paginator = self.pagination_class()
        page = paginator.paginate_queryset(files, request)
        serializer = FileReferenceListSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)


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
            **get_error_responses(NotesErrorCodes.NOTE_NOT_FOUND),
            **get_common_error_responses(),
        },
    ),
)
class NoteGraph(APIView):
    """Return knowledge graph subgraph for notes matching filters."""

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request: Request, note_id: UUID) -> Response:
        try:
            note: Note = Note.objects.get_accessible_notes(request.user).get(id=note_id)
        except Note.DoesNotExist:
            raise NoteNotFoundException(detail="That note could not be found.")

        # Get all relations for this note, filtered by user access
        rels = note.relations.accessible(user=cast(CradleUser, request.user))

        # Check if there are any relations
        if not rels.exists():
            return Response(
                {"entries": {}, "relations": [], "colors": {}},
                status=status.HTTP_200_OK,
            )

        serializer = SubGraphSerializer.from_relations(rels.all())
        return Response(serializer.data, status=status.HTTP_200_OK)
