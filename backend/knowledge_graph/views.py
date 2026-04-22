"""Knowledge graph API views: path finding, neighbors, and full graph."""

import datetime

from django.utils import timezone
from django.utils.dateparse import parse_datetime
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import status
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from access.enums import AccessType
from access.models import Access
from core.exceptions import BadRequestException, CoreErrorCodes
from core.openapi import get_common_error_responses, get_error_responses
from core.pagination import LazyPaginator, TotalPagesPagination
from core.validators import validate_int_list_param, validate_int_param, validate_page_param, validate_page_size
from entries.enums import EntryType
from entries.exceptions import EntriesErrorCodes, EntryNotFoundException
from entries.models import Entry, Relation
from query.exceptions import InvalidSearchSyntaxException, QueryErrorCodes
from query.filters import EntryFilter
from query.utils import parse_query

from .exceptions import DepthOutOfRangeException, KnowledgeGraphErrorCodes
from .serializers import (
    EntryWithDepthSerializer,
    GraphInaccessibleResponseSerializer,
    SubGraphSerializer,
)
from .utils import filter_valid_edges, get_edges_for_paths, get_neighbors, get_neighbors_paginated


def _get_accessible_entry(user, entry_id: int) -> Entry:
    """Return entry by ID if it exists and user has access; raise EntryNotFoundException otherwise."""
    try:
        entry = Entry.objects.get(pk=entry_id)
    except Entry.DoesNotExist:
        raise EntryNotFoundException(detail="That entry could not be found.")
    if entry.entry_class.type == EntryType.ENTITY and not Access.objects.has_access_to_entities(
        user, {entry}, {AccessType.READ, AccessType.READ_WRITE}
    ):
        raise EntryNotFoundException(detail="That entry could not be found.")
    return entry


@extend_schema(
    summary="Find paths in knowledge graph",
    description="Find paths between source and destination entries in the knowledge graph.",
    parameters=[
        OpenApiParameter(
            name="src",
            type=int,
            location=OpenApiParameter.QUERY,
            description="Source entry ID",
            required=True,
        ),
        OpenApiParameter(
            name="dsts",
            type=int,
            location=OpenApiParameter.QUERY,
            description="Destination entry IDs",
            required=True,
            many=True,
        ),
        OpenApiParameter(
            name="min_date",
            type=str,
            location=OpenApiParameter.QUERY,
            description="Minimum date",
            required=False,
        ),
        OpenApiParameter(
            name="max_date",
            type=str,
            location=OpenApiParameter.QUERY,
            description="Maximum date",
            required=False,
        ),
    ],
    responses={
        200: SubGraphSerializer,
        **get_error_responses(
            CoreErrorCodes.BAD_REQUEST,
            CoreErrorCodes.INVALID_REQUEST,
            EntriesErrorCodes.ENTRY_NOT_FOUND,
        ),
        **get_common_error_responses(),
    },
)
class GraphPathFindView(APIView):
    """Find shortest paths between a source entry and destination entries."""

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    serializer_class = SubGraphSerializer

    def get(self, request: Request) -> Response:
        start = validate_int_param(request.query_params.get("src"), param_name="src")
        ends = validate_int_list_param(
            request.query_params.getlist("dsts") or [],
            param_name="dsts",
        )
        if not ends:
            raise BadRequestException(detail="Select at least one destination.")

        _get_accessible_entry(request.user, start)
        for eid in ends:
            _get_accessible_entry(request.user, eid)

        min_date_raw = request.query_params.get("min_date")
        max_date_raw = request.query_params.get("max_date")
        min_date = (
            parse_datetime(min_date_raw)
            if min_date_raw
            else datetime.datetime.fromtimestamp(0, tz=datetime.timezone.utc)
        )
        max_date = parse_datetime(max_date_raw) if max_date_raw else timezone.now()
        if min_date is None or max_date is None:
            raise BadRequestException(detail="Enter valid start and end values for the date range.")

        edges = filter_valid_edges(
            get_edges_for_paths(
                start,
                ends,
                request.user,
                min_date,
                max_date,
            )
        )

        entry_ids = {edge.src for edge in edges} | {edge.dst for edge in edges}

        entries = Entry.objects.filter(id__in=entry_ids)

        colors = {e.entry_class.subtype: e.entry_class.color for e in entries if e.entry_class.subtype is not None}

        serializer = SubGraphSerializer({"relations": edges, "entries": entries, "colors": colors})

        return Response(serializer.data, status=status.HTTP_200_OK)


@extend_schema(
    summary="Get graph neighbors",
    description="Get neighboring entries in the knowledge graph for a given source entry.",
    parameters=[
        OpenApiParameter(
            name="src",
            type=int,
            location=OpenApiParameter.QUERY,
            description="Source entry ID",
            required=True,
        ),
        OpenApiParameter(
            name="depth",
            type=int,
            location=OpenApiParameter.QUERY,
            description="Search depth (0-5)",
            default=1,
        ),
        OpenApiParameter(
            name="page",
            type=int,
            location=OpenApiParameter.QUERY,
            description="Page number",
            default=1,
        ),
        OpenApiParameter(
            name="page_size",
            type=int,
            location=OpenApiParameter.QUERY,
            description="Number of results per page",
            default=200,
        ),
        OpenApiParameter(
            name="query",
            type=str,
            location=OpenApiParameter.QUERY,
            description="Query filter for results",
            required=False,
        ),
        OpenApiParameter(
            name="wildcard",
            type=bool,
            location=OpenApiParameter.QUERY,
            description="Use wildcard matching for query",
            default=False,
        ),
        OpenApiParameter(
            name="subtype",
            type={"type": "array", "items": {"type": "string"}},
            location=OpenApiParameter.QUERY,
            description="Filter by entry subtype(s). Supports repeated params: ?subtype=a&subtype=b",
            required=False,
            explode=True,
        ),
        OpenApiParameter(
            name="name",
            type={"type": "array", "items": {"type": "string"}},
            location=OpenApiParameter.QUERY,
            description="Filter by entry name (case-insensitive contains). Supports repeated params.",
            required=False,
            explode=True,
        ),
    ],
    responses={
        200: LazyPaginator().get_paginated_response_serializer(EntryWithDepthSerializer),
        **get_error_responses(
            CoreErrorCodes.INVALID_REQUEST,
            CoreErrorCodes.INVALID_PAGE,
            QueryErrorCodes.INVALID_SEARCH_SYNTAX,
            KnowledgeGraphErrorCodes.DEPTH_OUT_OF_RANGE,
            CoreErrorCodes.INVALID_PAGE_SIZE,
            CoreErrorCodes.PAGE_SIZE_TOO_LARGE,
            EntriesErrorCodes.ENTRY_NOT_FOUND,
            include_validation_error=True,
        ),
        **get_common_error_responses(),
    },
)
class GraphNeighborsView(APIView):
    """Get neighboring entries at a given depth with optional filters."""

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        source_id = validate_int_param(request.query_params.get("src"), param_name="src")
        page_size = validate_page_size(request.query_params.get("page_size", "200"), default=200, max_size=200)
        depth = validate_int_param(request.query_params.get("depth"), param_name="depth", default=1)
        page = validate_page_param(request.query_params.get("page"), param_name="page", default=1)

        if depth < 0 or depth > 5:
            raise DepthOutOfRangeException()

        source_entry = _get_accessible_entry(request.user, source_id)
        sourceset = source_entry.aliasqs(request.user).non_virtual()

        query_str = request.query_params.get("query")

        if query_str:
            if request.query_params.get("wildcard") == "true":
                query_str = query_str + "*"

            try:
                query_filter = parse_query(query_str)
            except ValueError as e:
                raise InvalidSearchSyntaxException(
                    detail="Use a colon between the entry type and name (for example, *:note or author:Smith)."
                ) from e

            neighbors_qs = get_neighbors_paginated(
                sourceset,
                depth,
                request.user,
                True,
                True,
                lambda qs: qs.filter(query_filter),
                page_size=page_size + 1,
                page_number=page,
                order_by="-last_seen",
            )
        else:
            filterset = EntryFilter(request.query_params, request=request)

            if filterset.is_valid():
                neighbors_qs = get_neighbors_paginated(
                    sourceset,
                    depth,
                    request.user,
                    True,
                    True,
                    lambda qs: EntryFilter(request.query_params, queryset=qs, request=request).qs,
                    page_size=page_size + 1,
                    page_number=page,
                    order_by="-last_seen",
                )
            else:
                raise DRFValidationError(filterset.errors)

        serializer = EntryWithDepthSerializer(neighbors_qs, many=True)
        results = serializer.data[:page_size]
        has_next = len(serializer.data) > page_size
        return LazyPaginator.format_response(page, has_next, results)


@extend_schema(
    summary="Get inaccessible graph entries",
    description="Get entries in the knowledge graph that are inaccessible to the current user.",
    parameters=[
        OpenApiParameter(
            name="src",
            type=int,
            location=OpenApiParameter.QUERY,
            description="Source entry ID",
            required=True,
        ),
        OpenApiParameter(
            name="depth",
            type=int,
            location=OpenApiParameter.QUERY,
            description="Search depth (0-5)",
            default=0,
        ),
    ],
    responses={
        200: GraphInaccessibleResponseSerializer,
        **get_error_responses(
            CoreErrorCodes.INVALID_REQUEST,
            CoreErrorCodes.PERMISSION_DENIED,
            KnowledgeGraphErrorCodes.DEPTH_OUT_OF_RANGE,
            EntriesErrorCodes.ENTRY_NOT_FOUND,
        ),
        **get_common_error_responses(),
    },
)
class GraphInaccessibleView(APIView):
    """List entity IDs that are reachable but inaccessible to the current user."""

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        source_id = validate_int_param(request.query_params.get("src"), param_name="src")
        depth = validate_int_param(
            request.query_params.get("depth"),
            param_name="depth",
            default=0,
        )

        if depth < 0 or depth > 5:
            raise DepthOutOfRangeException()

        if depth == 0:
            return Response(GraphInaccessibleResponseSerializer({"inaccessible": []}).data, status=status.HTTP_200_OK)

        source_entry = _get_accessible_entry(request.user, source_id)
        sourceset = source_entry.aliasqs(request.user).non_virtual()

        entities = get_neighbors(
            sourceset,
            depth,
            None,
            True,
            True,
            lambda qs: qs.filter(entry_class__type=EntryType.ENTITY),
        )

        inaccessible = Access.objects.inaccessible_entries(
            request.user, entities, {AccessType.READ, AccessType.READ_WRITE}
        )
        data = GraphInaccessibleResponseSerializer({"inaccessible": [e.id for e in inaccessible]}).data
        return Response(data, status=status.HTTP_200_OK)


@extend_schema(
    summary="Get knowledge graph",
    description="Returns the full knowledge graph accessible to the user.",
    responses={
        200: TotalPagesPagination().get_paginated_response_serializer(SubGraphSerializer, many=False),
        **get_common_error_responses(),
    },
)
class KnowledgeGraphView(APIView):
    """Return the full knowledge graph accessible to the user."""

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        rels = Relation.objects.accessible(user=request.user)

        if not rels.exists():
            return TotalPagesPagination.format_single_page_response(
                0,
                {"entries": {}, "relations": [], "colors": {}},
            )

        # Return full graph in one response (Cosmograph-style)
        rels_list = list(rels.all())
        serializer = SubGraphSerializer.from_relations(rels_list)
        return TotalPagesPagination.format_single_page_response(
            len(rels_list),
            serializer.data,
        )
