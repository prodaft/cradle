from django.db.models import Q, F
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.request import Request
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema, OpenApiParameter

from access.enums import AccessType
from access.models import Access
from core.pagination import LazyPaginator
from entries.enums import EntryType
from entries.models import Edge, Entry
from entries.serializers import EntrySerializer
from knowledge_graph.utils import filter_valid_edges, get_edges_for_paths, get_neighbors
from query.filters import EntryFilter
from query.utils import parse_query
from .serializers import (
    PathfindQuery,
    SubGraphSerializer,
    GraphInaccessibleResponseSerializer,
    EntryWithDepthSerializer,
)
from django.utils.dateparse import parse_datetime


@extend_schema(
    summary="Find paths in knowledge graph",
    description="Find paths between source and destination entries in the knowledge graph.",
    request=PathfindQuery,
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

    def post(self, request: Request) -> Response:
        query = PathfindQuery(data=request.data, user=request.user)
        query.is_valid(raise_exception=True)

        start = query.validated_data["src"]
        ends = query.validated_data["dsts"]

        edges = filter_valid_edges(
            get_edges_for_paths(
                start.id,
                [x.id for x in ends],
                request.user,
                query.validated_data["min_date"],
                query.validated_data["max_date"],
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

        serializer = SubGraphSerializer(
            {"relations": edges, "entries": entries, "colors": colors}
        )

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
    ],
    responses={
        200: EntrySerializer(many=True),
        400: {"description": "Invalid parameters or query syntax"},
        401: {"description": "User is not authenticated"},
        404: {"description": "Source entry not found"},
    },
)
class GraphNeighborsView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    serializer_class = EntrySerializer

    def get(self, request: Request) -> Response:
        source_id = request.query_params.get("src")
        if not source_id:
            return Response({"error": "Missing src parameter."}, status=400)

        try:
            depth = int(request.query_params.get("depth", 1))
            page_size = int(request.query_params.get("page_size", 200))
        except ValueError:
            return Response(
                {"error": "depth, page and page_size must be integers."}, status=400
            )

        if depth < 0 or depth > 5:
            return Response({"error": "depth must be between 0 and 5."}, status=400)

        # Retrieve the source entry (404 if not found)
        source_entry = Entry.objects.filter(pk=source_id).first()

        if not source_entry:
            return Response(
                {"error": f"Entry with ID {source_id} not found."}, status=404
            )

        if (
            source_entry.entry_class.type == EntryType.ENTITY
            and not Access.objects.has_access_to_entities(
                request.user, {source_entry}, {AccessType.READ, AccessType.READ_WRITE}
            )
        ):
            return Response(
                {"error": f"Entry with ID {source_id} not found."}, status=404
            )

        sourceset = source_entry.aliasqs(request.user).non_virtual()

        neighbors_qs = get_neighbors(
            sourceset, depth, request.user, True, True
        ).order_by("depth", "-last_seen")

        query_str = request.query_params.get("query")

        if query_str:
            if request.query_params.get("wildcard") == "true":
                query_str = "*" + query_str + "*"

            try:
                query_filter = parse_query(request.query_params.get("query"))
            except Exception as e:
                return Response(
                    {"error": f"Invalid query syntax: {str(e)}"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            neighbors_qs = neighbors_qs.filter(query_filter)
        else:
            filterset = EntryFilter(request.query_params, queryset=neighbors_qs)

            if filterset.is_valid():
                neighbors_qs = filterset.qs
            else:
                return Response(
                    {"error": f"Invalid query syntax: {filterset.errors}"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        paginator = LazyPaginator(page_size=page_size)
        paginated_entries = paginator.paginate_queryset(neighbors_qs, request)

        if paginated_entries is not None:
            serializer = EntryWithDepthSerializer(paginated_entries, many=True)
            return paginator.get_paginated_response(serializer.data)

        serializer = EntryWithDepthSerializer(neighbors_qs, many=True)
        return Response(serializer.data)


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
            return Response({"error": "Missing src parameter."}, status=400)

        try:
            depth = int(request.query_params.get("depth", 0))
        except ValueError:
            return Response({"error": "depth must be integer."}, status=400)

        if depth < 0 or depth > 5:
            return Response({"error": "depth must be between 0 and 5."}, status=400)

        if depth == 0:
            return Response(
                {"inaccessible": []},
            )

        # Retrieve the source entry (404 if not found)
        source_entry = Entry.objects.filter(pk=source_id).first()

        if not source_entry:
            return Response(
                {"error": f"Entry with ID {source_id} not found."}, status=404
            )

        if (
            source_entry.entry_class.type == EntryType.ENTITY
            and not Access.objects.has_access_to_entities(
                request.user, {source_entry}, {AccessType.READ, AccessType.READ_WRITE}
            )
        ):
            return Response(
                {"error": f"Entry with ID {source_id} not found."}, status=404
            )

        sourceset = source_entry.aliasqs(request.user).non_virtual()

        neighbors_qs = get_neighbors(
            sourceset, depth, None, True, True
        )  # Queryset of all neighbors

        entities = neighbors_qs.filter(entry_class__type=EntryType.ENTITY)

        inaccessible = Access.objects.inaccessible_entries(
            request.user, entities, {AccessType.READ, AccessType.READ_WRITE}
        )

        return Response({"inaccessible": [entry.id for entry in inaccessible]})


@extend_schema(
    summary="Fetch knowledge graph data",
    description="Fetch graph data with entries and edges for visualization.",
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
            description="Search depth",
            default=1,
        ),
        OpenApiParameter(
            name="page_size",
            type=int,
            location=OpenApiParameter.QUERY,
            description="Number of results per page",
            default=200,
        ),
    ],
    responses={
        200: SubGraphSerializer,
        400: {"description": "Invalid parameters"},
        401: {"description": "User is not authenticated"},
        404: {"description": "Source entry not found"},
    },
)
class FetchGraphView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    serializer_class = SubGraphSerializer

    def get(self, request: Request) -> Response:
        try:
            depth = int(request.query_params.get("depth", 1))
            page_size = int(request.query_params.get("page_size", 200))

            source_id_s = request.query_params.get("src")
            source_id = int(source_id_s) if source_id_s else None

            if not source_id:
                return Response({"error": "Missing src parameter."}, status=400)
        except ValueError:
            return Response(
                {"error": "depth, src and page_size must be integers."}, status=400
            )

        if depth < 1 or depth > 3:
            return Response({"error": "depth must be between 1 and 3."}, status=400)

        # Retrieve the source entry (404 if not found)
        source_entry = Entry.objects.filter(pk=source_id).first()

        if not source_entry:
            return Response(
                {"error": f"Entry with ID {source_id} not found."}, status=404
            )

        if (
            source_entry.entry_class.type == EntryType.ENTITY
            and not Access.objects.has_access_to_entities(
                request.user, {source_entry}, {AccessType.READ, AccessType.READ_WRITE}
            )
        ):
            return Response(
                {"error": f"Entry with ID {source_id} not found."}, status=404
            )

        sourceset = Entry.objects.filter(pk=source_id)

        at_depth = get_neighbors(sourceset, depth, request.user, False).values_list(
            "id", flat=True
        )

        if depth == 0:
            prev_depth = sourceset
        else:
            prev_depth = get_neighbors(
                sourceset, depth - 1, request.user, False
            ).values_list("id", flat=True)

        # Page size parsing
        try:
            page_size = int(request.query_params.get("page_size", 200))
        except ValueError:
            return Response({"error": "page_size must be integer."}, status=400)

        paginator = LazyPaginator(page_size=page_size)
        paginated_at_depth = paginator.paginate_queryset(at_depth, request)

        edges = Edge.objects.filter(
            (Q(src__in=prev_depth) & Q(dst__in=paginated_at_depth))
            | (
                Q(src__in=paginated_at_depth, dst__in=paginated_at_depth)
                & Q(src__gt=F("dst"))
            )
        ).order_by("-last_seen")

        # Parse optional date filters
        start_date = parse_datetime(
            request.query_params.get("start_date")
        )  # ISO format expected
        end_date = parse_datetime(request.query_params.get("end_date"))

        if start_date and end_date:
            edges = edges.filter(
                Q(created_at__range=(start_date, end_date))
                | Q(last_seen__range=(start_date, end_date))
            )
        elif start_date:
            edges = edges.filter(
                Q(created_at__gte=start_date) | Q(last_seen__gte=start_date)
            )
        elif end_date:
            edges = edges.filter(
                Q(created_at__lte=end_date) | Q(last_seen__lte=end_date)
            )

        if depth == 0:
            entries = sourceset
        else:
            entry_ids = {i.src for i in edges} | {i.dst for i in edges}
            entries = Entry.objects.filter(id__in=entry_ids)

        colors = {i.entry_class_id: i.entry_class.color for i in entries}

        serializer = SubGraphSerializer(
            {"relations": edges, "entries": entries, "colors": colors}
        )

        return paginator.get_paginated_response(serializer.data)
