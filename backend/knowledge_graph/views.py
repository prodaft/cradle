import datetime

from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from access.enums import AccessType
from access.models import Access
from core.exceptions import BadRequestException
from core.pagination import LazyPaginator, TotalPagesPagination
from entries.enums import EntryType
from entries.exceptions import EntryNotFoundException
from entries.models import Entry, Relation
from knowledge_graph.exceptions import InvalidDepthException, InvalidQuerySyntaxException
from knowledge_graph.utils import filter_valid_edges, get_edges_for_paths, get_neighbors, get_neighbors_paginated
from query.filters import EntryFilter
from query.utils import parse_query

from .serializers import (
    EntryWithDepthSerializer,
    EntryWithDepthSerializerView,
    GraphInaccessibleResponseSerializer,
    SubGraphSerializer,
)


@extend_schema(
    summary="Find paths in knowledge graph",
    description="Find paths between source and destination entries in the knowledge graph.",
    parameters=[
        OpenApiParameter(
            name="src",
            type=str,
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
        400: {"description": "Invalid request data"},
        401: {"description": "User is not authenticated"},
    },
)
class GraphPathFindView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    serializer_class = SubGraphSerializer

    def get(self, request: Request) -> Response:
        start = request.query_params.get("src")

        if not start:
            raise BadRequestException(detail="Missing src parameter.")

        if not start.isdigit():
            raise BadRequestException(detail="src must be an integer.")

        ends = request.query_params.getlist("dsts")
        if not ends:
            raise BadRequestException(detail="Missing dsts parameter.")
        for end in ends:
            if not end.isdigit():
                raise BadRequestException(detail="dsts must be integers.")

        ends = [int(end) for end in ends]

        min_date = request.query_params.get("min_date") or datetime.datetime.fromtimestamp(0)
        max_date = request.query_params.get("max_date") or datetime.datetime.now()

        edges = filter_valid_edges(
            get_edges_for_paths(
                start,
                ends,
                request.user,
                min_date,
                max_date,
            )
        )

        entry_ids = set()

        for i in edges:
            entry_ids.add(i.src)
            entry_ids.add(i.dst)

        entries = Entry.objects.filter(id__in=entry_ids)

        colors = {}

        for i in entries.all():
            if i.entry_class_id not in colors:
                colors[i.entry_class_id] = i.entry_class.color

        print(edges, entries, colors)
        serializer = SubGraphSerializer({"relations": edges, "entries": entries, "colors": colors})

        return Response(serializer.data)


@extend_schema(
    summary="Get graph neighbors",
    description="Get neighboring entries in the knowledge graph for a given source entry.",
    parameters=[
        OpenApiParameter(
            name="src",
            type=str,
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
        200: LazyPaginator().get_paginated_response_serializer(EntryWithDepthSerializerView),
        400: {"description": "Invalid parameters or query syntax"},
        401: {"description": "User is not authenticated"},
        404: {"description": "Source entry not found"},
    },
)
class GraphNeighborsView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        source_id = request.query_params.get("src")
        if not source_id:
            raise BadRequestException(detail="Missing src parameter.")

        try:
            depth = int(request.query_params.get("depth", 1))
            page_size = int(request.query_params.get("page_size", 200))
        except ValueError:
            raise BadRequestException(detail="depth, page and page_size must be integers.")

        if depth < 0 or depth > 5:
            raise InvalidDepthException(detail="depth must be between 0 and 5.")

        # Retrieve the source entry (404 if not found)
        source_entry = Entry.objects.filter(pk=source_id).first()

        if not source_entry:
            raise EntryNotFoundException(detail=f"Entry with ID {source_id} not found.")

        if source_entry.entry_class.type == EntryType.ENTITY and not Access.objects.has_access_to_entities(
            request.user, {source_entry}, {AccessType.READ, AccessType.READ_WRITE}
        ):
            raise EntryNotFoundException(detail=f"Entry with ID {source_id} not found.")

        sourceset = source_entry.aliasqs(request.user).non_virtual()

        query_str = request.query_params.get("query")

        if query_str:
            if request.query_params.get("wildcard") == "true":
                query_str = "*" + query_str + "*"

            try:
                query_filter = parse_query(request.query_params.get("query"))
            except Exception as e:
                raise InvalidQuerySyntaxException(detail=f"Invalid query syntax: {str(e)}")

            neighbors_qs = get_neighbors_paginated(
                sourceset,
                depth,
                request.user,
                True,
                True,
                lambda qs: qs.filter(query_filter),
                page_size=page_size,
                page_number=int(request.query_params.get("page", 1)),
                order_by="-last_seen",
            )
        else:
            filterset = EntryFilter(request.query_params)

            if filterset.is_valid():
                neighbors_qs = get_neighbors_paginated(
                    sourceset,
                    depth,
                    request.user,
                    True,
                    True,
                    lambda qs: EntryFilter(request.query_params, queryset=qs).qs,
                    page_size=page_size,
                    page_number=int(request.query_params.get("page", 1)),
                    order_by="-last_seen",
                )
            else:
                raise InvalidQuerySyntaxException(
                    detail=f"Invalid query syntax: {filterset.errors}"
                )

        serializer = EntryWithDepthSerializer(neighbors_qs, many=True)
        return Response(
            {
                "page": int(request.query_params.get("page", 1)),
                "has_next": len(serializer.data) == page_size,
                "results": serializer.data,
            }
        )


@extend_schema(
    summary="Get inaccessible graph entries",
    description="Get entries in the knowledge graph that are inaccessible to the current user.",
    parameters=[
        OpenApiParameter(
            name="src",
            type=str,
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
        400: {"description": "Invalid parameters"},
        401: {"description": "User is not authenticated"},
        404: {"description": "Source entry not found"},
    },
)
class GraphInaccessibleView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        source_id = request.query_params.get("src")
        if not source_id:
            raise BadRequestException(detail="Missing src parameter.")

        try:
            depth = int(request.query_params.get("depth", 0))
        except ValueError:
            raise BadRequestException(detail="depth must be an integer.")

        if depth < 0 or depth > 5:
            raise InvalidDepthException(detail="depth must be between 0 and 5.")

        if depth == 0:
            return Response(
                {"inaccessible": []},
            )

        # Retrieve the source entry (404 if not found)
        source_entry = Entry.objects.filter(pk=source_id).first()

        if not source_entry:
            raise EntryNotFoundException(detail=f"Entry with ID {source_id} not found.")

        if source_entry.entry_class.type == EntryType.ENTITY and not Access.objects.has_access_to_entities(
            request.user, {source_entry}, {AccessType.READ, AccessType.READ_WRITE}
        ):
            raise EntryNotFoundException(detail=f"Entry with ID {source_id} not found.")

        sourceset = source_entry.aliasqs(request.user).non_virtual()

        entities = get_neighbors(
            sourceset,
            depth,
            None,
            True,
            True,
            lambda qs: qs.filter(entry_class__type=EntryType.ENTITY),
        )  # Queryset of all neighbors

        inaccessible = Access.objects.inaccessible_entries(
            request.user, entities, {AccessType.READ, AccessType.READ_WRITE}
        )

        return Response({"inaccessible": [entry.id for entry in inaccessible]})


@extend_schema(
    summary="Get knowledge graph",
    description="Returns the full knowledge graph accessible to the user.",
    responses={
        200: TotalPagesPagination().get_paginated_response_serializer(SubGraphSerializer),
        401: {"description": "User is not authenticated"},
    },
)
class KnowledgeGraphView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        rels = Relation.objects.accessible(user=request.user)

        if not rels.exists():
            return Response(
                {
                    "page": 1,
                    "count": 0,
                    "total_pages": 1,
                    "results": {
                        "entries": {},
                        "relations": [],
                        "colors": {},
                        "message": "No graph relations are accessible.",
                    },
                },
                status=status.HTTP_200_OK,
            )

        # Return full graph in one response (Cosmograph-style)
        rels_list = list(rels.all())
        serializer = SubGraphSerializer.from_relations(rels_list)
        return Response(
            {
                "page": 1,
                "count": len(rels_list),
                "total_pages": 1,
                "results": serializer.data,
            },
            status=status.HTTP_200_OK,
        )
