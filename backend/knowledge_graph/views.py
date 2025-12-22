from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from access.enums import AccessType
from access.models import Access
from core.pagination import LazyPaginator
from entries.enums import EntryType
from entries.models import Entry, Relation
from knowledge_graph.utils import get_neighbors, get_neighbors_paginated
from query.filters import EntryFilter
from query.utils import parse_query

from .serializers import (
    EntryWithDepthSerializer,
    EntryWithDepthSerializerView,
    GraphInaccessibleResponseSerializer,
    SubGraphSerializer,
)


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
    ],
    responses={
        200: LazyPaginator().get_paginated_response_serializer(
            EntryWithDepthSerializerView
        ),
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
                return Response(
                    {"error": f"Invalid query syntax: {filterset.errors}"},
                    status=status.HTTP_400_BAD_REQUEST,
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
        200: SubGraphSerializer,
        401: {"description": "User is not authenticated"},
    },
)
class KnowledgeGraphView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        # Get all relations accessible to the user
        rels = Relation.objects.accessible(user=request.user)

        # Check if there are any relations
        if not rels.exists():
            # Return empty graph
            return Response(
                {
                    "entries": {},
                    "relations": [],
                    "colors": {},
                    "message": "No graph relations are accessible.",
                },
                status=status.HTTP_200_OK,
            )

        serializer = SubGraphSerializer.from_relations(rels.all())
        return Response(serializer.data, status=status.HTTP_200_OK)
