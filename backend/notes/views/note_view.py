"""Note list, detail, finalize, files, and graph API views."""

import json
import re
from typing import cast
from uuid import UUID

from django.contrib.contenttypes.models import ContentType
from django.db import transaction
from django.db.models import BooleanField, Count, ExpressionWrapper, Prefetch, Q
from django.urls import reverse
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import status
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from access.enums import AccessType
from access.models import Access
from core.exceptions import CoreErrorCodes, InvalidRequestException, PermissionDeniedException
from core.openapi import get_common_error_responses, get_error_responses
from core.pagination import TotalPagesPagination
from core.query_lang import And, Exact, Phrase, Term, parse_search, search_q, to_q
from core.utils import validate_order_by
from core.validators import (
    validate_choice_list_param,
    validate_choice_param,
    validate_int_list_param,
    validate_int_param,
)
from entries.constants import INTERNAL_SUBTYPES
from entries.enums import EntryType
from entries.exceptions import EntriesErrorCodes, EntryNotFoundException
from entries.models import Entry, Relation
from entries.tasks import refresh_edges_materialized_view
from file_transfer.exceptions import FileReferenceNotFoundException, FileTransferErrorCodes
from file_transfer.models import FileReference
from knowledge_graph.serializers import SubGraphSerializer
from logs.models import EventLog
from logs.serializers import EVENT_LOG_PAGE_RESPONSE, EventLogSerializer
from user.authentication import CookieJWTAuthentication
from user.models import CradleUser
from user.permissions import HasAdminRole

from ..enums import NoteStatus
from ..exceptions import (
    CannotEditNoteException,
    InvalidReferenceCountException,
    NoAccessToEntriesException,
    NoteEditConflictException,
    NoteIsEmptyException,
    NoteNotFoundException,
    NotesErrorCodes,
)
from ..filters import NoteFilter, NoteHistoryFilter
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
    FileDetailSerializer,
    FileReferenceListSerializer,
    FileReferenceWithNoteSerializer,
    FleetingNoteSerializer,
    NoteEditSerializer,
    NoteListResponseSerializer,
    NoteListSerializer,
    NoteRetrieveSerializer,
)

NOTE_SEARCH_FIELDS = ("content", "title", "author__username", "editor__username")
FILE_SEARCH_FIELDS = ("file_name", "mimetype", "md5_hash", "sha1_hash", "sha256_hash")

_NOTE_LIST_STATUS_QUERY_CHOICES: list[str] = ["fleeting", "finalized", *[c[0] for c in NoteStatus.choices]]

RESTRICTED_NOTE_SEARCH_FIELDS = ("content", "title")
RESTRICTED_NOTE_MIN_TERM_LENGTH = 3
RESTRICTED_NOTE_LIMIT = 100
_RESTRICTED_NOTE_ALLOWED_PARAMS = frozenset(
    {"search", "include_restricted", "page", "page_size", "order_by", "truncate"}
)


def _wants_restricted_notes(request) -> bool:
    """Whether the request asks for restricted notes and can get any."""
    return request.query_params.get("include_restricted") == "true" and request.user.can_see_restricted_notes


def _is_plain_text(node) -> bool:
    """True for terms, phrases and exact matches of RESTRICTED_NOTE_MIN_TERM_LENGTH+ characters, ANDed together.

    Wildcards, OR and NOT are excluded: they would match broad sets of restricted notes.
    """
    if isinstance(node, (Term, Phrase, Exact)):
        return len(node.text) >= RESTRICTED_NOTE_MIN_TERM_LENGTH
    if isinstance(node, And):
        return _is_plain_text(node.left) and _is_plain_text(node.right)
    return False


def _restricted_note_ids(request, user: CradleUser) -> list[UUID]:
    """Ids of published notes the user cannot access that match the request's plain-text search."""
    params = request.query_params
    if not _wants_restricted_notes(request) or set(params) - _RESTRICTED_NOTE_ALLOWED_PARAMS:
        return []
    node = parse_search(params.get("search"))
    if node is None or not _is_plain_text(node):
        return []
    accessible_ids = Note.objects.get_accessible_notes(user).order_by().values("id")
    return list(
        Note.objects.non_fleeting()
        .filter(to_q(node, RESTRICTED_NOTE_SEARCH_FIELDS))
        .exclude(id__in=accessible_ids)
        .values_list("id", flat=True)[:RESTRICTED_NOTE_LIMIT]
    )


def _log_restricted_notes(user: CradleUser, notes) -> None:
    """Record the restricted notes shown to the user.

    Logged against the user, not the notes, so the notes' history doesn't reveal who searched.
    """
    note_ids = [str(note.id) for note in notes if getattr(note, "is_accessible", True) is False]
    if note_ids:
        user.log_fetch(user, details=json.dumps({"reason": "restricted_note_search", "notes": note_ids}))


def notes_holding_file(queryset, file: FileReference):
    """Notes in ``queryset`` holding ``file`` or a copy of it (same SHA-256)."""
    holds = Q(files__id=file.id)
    if file.sha256_hash:
        holds |= Q(files__sha256_hash=file.sha256_hash)
    return queryset.filter(holds).distinct()


def get_readable_note(user: CradleUser, note_id: UUID) -> Note:
    """Return the note if ``user`` may read it, else raise NoteNotFoundException.

    Checks the access-vector queryset first, then ``has_read_access`` (the vector is
    recomputed asynchronously and may lag behind access changes).
    """
    try:
        return Note.objects.get_accessible_notes(user).get(id=note_id)
    except Note.DoesNotExist:
        pass
    try:
        note = Note.objects.get(id=note_id)
    except Note.DoesNotExist:
        raise NoteNotFoundException(detail="That note could not be found.")
    if not note.has_read_access(user):
        raise NoteNotFoundException(detail="That note could not be found.")
    return note


@extend_schema_view(
    get=extend_schema(
        operation_id="notes_list",
        summary="Get accessible notes",
        description="Returns paginated list of notes that the user has access to. Can filter by references and other parameters. Results are ordered by creation time descending.",  # noqa: E501
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
                description=(
                    "Filter by note status (repeat for OR). "
                    "`finalized` means non-fleeting notes; `fleeting` limits to the current user's fleeting notes. "
                    "Omit this parameter for the default list (accessible notes plus your fleeting notes)."
                ),
                enum=list(map(lambda x: x[0], NoteStatus.choices)) + ["fleeting", "finalized"],
                many=True,
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
                name="file",
                type=UUID,
                location=OpenApiParameter.QUERY,
                description="Filter notes holding this file or a copy of it (same SHA-256)",
                required=False,
            ),
            OpenApiParameter(
                name="created_at_gte",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Filter by creation time greater than or equal to (ISO datetime format)",
                required=False,
            ),
            OpenApiParameter(
                name="created_at_lte",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Filter by creation time less than or equal to (ISO datetime format)",
                required=False,
            ),
            OpenApiParameter(
                name="updated_at_gte",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Filter by last edit time greater than or equal to (ISO datetime format)",
                required=False,
            ),
            OpenApiParameter(
                name="updated_at_lte",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Filter by last edit time less than or equal to (ISO datetime format)",
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
                name="author",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Filter by author username (case-insensitive partial match)",
                required=False,
            ),
            OpenApiParameter(
                name="editor",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Filter by last editor username (case-insensitive partial match)",
                required=False,
            ),
            OpenApiParameter(
                name="order_by",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Order notes by field(s). Prefix with '-' for descending order. Multiple fields can be separated by commas. Valid fields: created_at, updated_at, title, author, editor. Default: -created_at",  # noqa: E501
                required=False,
                default="-created_at",
            ),
            OpenApiParameter(
                name="search",
                type=str,
                location=OpenApiParameter.QUERY,
                description=(
                    "Free-text search over content, title, author and editor username. Supports the search "
                    'syntax: terms/"phrases" (contains), =exact, wildcards (adm*n), AND/OR, NOT/-term, parentheses.'
                ),
                required=False,
            ),
            OpenApiParameter(
                name="include_restricted",
                type=bool,
                location=OpenApiParameter.QUERY,
                description=(
                    "Also return published notes you cannot access whose content or title matches search, "
                    "redacted to their id and timestamps with accessible=false, after the accessible notes. "
                    "Only for plain-text searches (terms, phrases or =exact of 3+ characters, combined with AND) "
                    "with no other filters, and only when enabled in the search settings."
                ),
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

    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAuthenticated]
    pagination_class = TotalPagesPagination

    def get(self, request: Request) -> Response:
        user = cast(CradleUser, request.user)
        status_tokens: list[str] | None = None
        raw_status = request.query_params.getlist("status")
        if raw_status:
            stripped_status = [str(x).strip() for x in raw_status if str(x).strip()]
            if stripped_status:
                validated_status = validate_choice_list_param(
                    stripped_status,
                    _NOTE_LIST_STATUS_QUERY_CHOICES,
                    param_name="status",
                    max_length=20,
                )
                status_tokens = validated_status or None

        if status_tokens is None:
            queryset = Note.objects.get_accessible_notes(user)
        else:
            queryset = Note.objects.none()
            for token in status_tokens:
                if token == "fleeting":
                    queryset = queryset | Note.objects.filter(author=user, fleeting=True)
                elif token == "finalized":
                    queryset = queryset | Note.objects.get_accessible_notes(user).filter(fleeting=False)
                else:
                    queryset = queryset | Note.objects.get_accessible_notes(user).filter(
                        fleeting=False,
                        status=token,
                    )
            queryset = queryset.distinct()

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
            if entry.entry_class.type == EntryType.ENTITY and not Access.objects.has_access_to_entities(
                user, {entry}, {AccessType.READ, AccessType.READ_WRITE}
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

        if "file" in request.query_params:
            try:
                file_id = UUID(request.query_params["file"])
            except ValueError:
                raise InvalidRequestException(detail='Query parameter "file" must be a UUID.')
            file = FileReference.objects.filter(id=file_id).first()
            queryset = notes_holding_file(queryset, file) if file else queryset.none()

        search = search_q(request.query_params.get("search"), NOTE_SEARCH_FIELDS)
        if search is not None:
            queryset = queryset.filter(search)

        filterset = NoteFilter(request.query_params, queryset=queryset)

        if filterset.is_valid():
            notes = filterset.qs

            # Handle ordering
            order_by = request.query_params.get("order_by", "-created_at")
            valid_order_fields = {
                "created_at": "timestamp",
                "updated_at": "edit_timestamp",
                "title": "title",
                "author": "author__username",
                "editor": "editor__username",
            }

            # Parse and validate order_by parameter
            order_fields = validate_order_by(order_by, valid_order_fields) or ["-timestamp"]
            notes = notes.order_by(*order_fields)

            # Restricted notes, if any, go after the accessible ones
            restricted_ids = _restricted_note_ids(request, user)
            if restricted_ids:
                notes = (
                    Note.objects.filter(Q(id__in=notes.order_by().values("id")) | Q(id__in=restricted_ids))
                    .annotate(is_accessible=ExpressionWrapper(~Q(id__in=restricted_ids), output_field=BooleanField()))
                    .order_by("-is_accessible", *order_fields)
                )

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
            _log_restricted_notes(user, page)
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
        description=(
            "Returns the full details of a specific note. User must have access to view the note. "
            "When restricted note search is enabled, a published note the user cannot read returns 403 "
            "instead of 404."
        ),
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
        description="Updates an existing note. User must have note write permission (admin, or read-write access to all referenced entities).",  # noqa: E501
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
                NotesErrorCodes.NOTE_EDIT_CONFLICT,
                include_validation_error=True,
            ),
            **get_common_error_responses(),
        },
    ),
    delete=extend_schema(
        operation_id="notes_delete",
        summary="Delete note",
        description="Deletes an existing note. User must have note write permission (admin, or read-write access to all referenced entities).",
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

    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAuthenticated]
    serializer_class = NoteRetrieveSerializer

    def get(self, request: Request, note_id: UUID) -> Response:
        user = cast(CradleUser, request.user)
        try:
            note = get_readable_note(user, note_id)
        except NoteNotFoundException:
            if user.can_see_restricted_notes and Note.objects.non_fleeting().filter(id=note_id).exists():
                raise PermissionDeniedException(detail="You do not have access to this note.")
            raise
        return Response(
            NoteRetrieveSerializer(note, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )

    def patch(self, request: Request, note_id: UUID) -> Response:
        user = cast(CradleUser, request.user)
        note = get_readable_note(user, note_id)

        if not note.has_write_access(user):
            raise CannotEditNoteException(detail="You do not have permission to edit this note.")

        serializer = NoteEditSerializer(note, data=request.data, context={"request": request})

        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            current = serializer.instance = Note.objects.select_for_update().get(id=note.id)
            base_hash = serializer.validated_data.get("base_content_hash")
            content = serializer.validated_data.get("content", current.content)
            if base_hash is not None and base_hash != current.content_hash and content != current.content:
                raise NoteEditConflictException(detail="This note was changed by someone else since you loaded it.")
            note = serializer.save()
        json_note = NoteRetrieveSerializer(note, context={"request": request}).data
        return Response(json_note, status=status.HTTP_200_OK)

    def delete(self, request: Request, note_id: UUID) -> Response:
        user = cast(CradleUser, request.user)
        note_to_delete = get_readable_note(user, note_id)
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

    authentication_classes = [CookieJWTAuthentication]
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

    authentication_classes = [CookieJWTAuthentication]
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

    authentication_classes = [CookieJWTAuthentication]
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
        description="Returns paginated list of files that are linked to notes the user has access to. Can filter by references and other parameters. Results are ordered by file creation time descending.",  # noqa: E501
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
                name="search",
                type=str,
                location=OpenApiParameter.QUERY,
                description=(
                    "Free-text search over file name, mimetype and MD5/SHA1/SHA256 hashes. Supports the search "
                    'syntax: terms/"phrases" (contains), =exact, wildcards (*.pdf), AND/OR, NOT/-term, parentheses.'
                ),
            ),
            OpenApiParameter(
                name="mime_type",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Filter files by MIME type (case-insensitive partial match; `*` is a wildcard, e.g. image/*)",
            ),
            OpenApiParameter(
                name="date",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Filter notes by date (YYYY-MM-DD format)",
                required=False,
            ),
            OpenApiParameter(
                name="created_at_gte",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Filter notes by creation time greater than or equal to (ISO datetime format)",
                required=False,
            ),
            OpenApiParameter(
                name="created_at_lte",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Filter notes by creation time less than or equal to (ISO datetime format)",
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
                description="Order files by field(s). Prefix with '-' for descending order. Multiple fields can be separated by commas. Valid fields: created_at, name, mime_type, note__created_at, size. Default: -created_at",  # noqa: E501
                required=False,
                default="-created_at",
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

    authentication_classes = [CookieJWTAuthentication]
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
            if entry.entry_class.type == EntryType.ENTITY and not Access.objects.has_access_to_entities(
                user, {entry}, {AccessType.READ, AccessType.READ_WRITE}
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

        search = search_q(request.query_params.get("search"), FILE_SEARCH_FIELDS)
        if search is not None:
            files = files.filter(search)

        if request.query_params.get("mime_type"):
            mimetype = request.query_params.get("mime_type")
            parts = mimetype.split("*")
            mimetype_pattern = ".*".join(re.escape(p) for p in parts)
            files = files.filter(mimetype__iregex=mimetype_pattern)

        status_filter = validate_choice_param(
            request.query_params.get("status"),
            ["healthy", "warning"],
            param_name="status",
        )
        if status_filter == "healthy":
            files = files.filter(sha256_hash__isnull=False).exclude(sha256_hash="")
        elif status_filter == "warning":
            files = files.filter(Q(sha256_hash__isnull=True) | Q(sha256_hash=""))

        order_by = request.query_params.get("order_by", "-created_at")
        valid_order_fields = {
            "created_at": "timestamp",
            "name": "file_name",
            "mime_type": "mimetype",
            "note__created_at": "note__timestamp",
            "size": "file_size",
        }

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
        operation_id="notes_files_detail",
        summary="Get file dashboard data",
        description=(
            "Returns a file's metadata and the entries linked through the accessible notes holding it or a copy "
            "of it (same SHA-256). List those notes with `GET /notes/?file=<id>`."
        ),
        responses={
            200: FileDetailSerializer,
            **get_error_responses(FileTransferErrorCodes.FILE_REFERENCE_NOT_FOUND),
            **get_common_error_responses(),
        },
    ),
)
class FileDetail(APIView):
    """Dashboard data for a single file attached to an accessible note."""

    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request: Request, file_id: UUID) -> Response:
        user = cast(CradleUser, request.user)
        file = FileReference.objects.filter(id=file_id, note__isnull=False).first()
        if file is None:
            raise FileReferenceNotFoundException(detail="That file could not be found.")
        try:
            note = get_readable_note(user, file.note_id)
        except NoteNotFoundException:
            raise FileReferenceNotFoundException(detail="That file could not be found.")

        copies = notes_holding_file(Note.objects.get_accessible_notes(user), file)
        file.linked_entries = (
            Entry.objects.filter(Q(notes=note) | Q(notes__in=copies.values("id")))
            .exclude(entry_class__subtype__in=INTERNAL_SUBTYPES)
            .select_related("entry_class")
            .distinct()
            .order_by("entry_class__type", "entry_class__subtype", "name")
        )
        return Response(FileDetailSerializer(file).data, status=status.HTTP_200_OK)


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

    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request: Request, note_id: UUID) -> Response:
        try:
            note: Note = Note.objects.get_accessible_notes(request.user).get(id=note_id)
        except Note.DoesNotExist:
            raise NoteNotFoundException(detail="That note could not be found.")

        rels = note.relations.accessible(user=cast(CradleUser, request.user))

        if not rels.exists():
            return Response(
                {"entries": {}, "relations": [], "colors": {}},
                status=status.HTTP_200_OK,
            )

        serializer = SubGraphSerializer.from_relations(rels.all())
        return Response(serializer.data, status=status.HTTP_200_OK)


@extend_schema_view(
    get=extend_schema(
        operation_id="notes_history_list",
        summary="List note history",
        description=(
            "Returns the paginated event log (create and edit events) of a single note. "
            "Available to any user with read access to the note. Unlike ``/logs/``, rows that "
            "were propagated to linked entries are still listed."
        ),
        parameters=[
            OpenApiParameter(
                name="note_id",
                type=UUID,
                location=OpenApiParameter.PATH,
                description="The note's id",
            ),
        ],
        responses={
            200: EVENT_LOG_PAGE_RESPONSE,
            **get_error_responses(
                NotesErrorCodes.NOTE_NOT_FOUND,
                CoreErrorCodes.INVALID_PAGE_SIZE,
                CoreErrorCodes.PAGE_SIZE_TOO_LARGE,
            ),
            **get_common_error_responses(),
        },
    ),
)
class NoteHistory(ListAPIView):
    """List the event log of a note the user can read."""

    serializer_class = EventLogSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_class = NoteHistoryFilter
    pagination_class = TotalPagesPagination

    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = EventLog.objects.select_related("user", "content_type", "src_log")
        if getattr(self, "swagger_fake_view", False):
            return qs.none()

        note = get_readable_note(cast(CradleUser, self.request.user), self.kwargs["note_id"])
        return qs.filter(content_type=ContentType.objects.get_for_model(Note), object_id=str(note.id))
