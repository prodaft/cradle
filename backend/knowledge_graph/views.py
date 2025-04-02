from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.request import Request
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.permissions import IsAuthenticated

from access.enums import AccessType
from access.models import Access
from core.pagination import LazyPaginator
from entries.enums import EntryType
from entries.models import Edge, Entry
from entries.serializers import EntrySerializer
from knowledge_graph.utils import get_edges_for_paths, get_neighbors
from query.filters import EntryFilter
from query.utils import parse_query
from .serializers import PathfindQuery, SubGraphSerializer


class GraphPathFindView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request: Request) -> Response:
        query = PathfindQuery(data=request.data, user=request.user)
        query.is_valid(raise_exception=True)

        start = query.validated_data["src"]
        ends = query.validated_data["dsts"]

        edges = get_edges_for_paths(
            start.id,
            [x.id for x in ends],
            request.user,
            query.validated_data["min_date"],
            query.validated_data["max_date"],
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

        if depth < 1 or depth > 4:
            return Response({"error": "depth must be between 1 and 4."}, status=400)

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

        sourceset = source_entry.aliasqs(request.user)

        neighbors_qs = get_neighbors(sourceset, depth, request.user)

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
            serializer = EntrySerializer(paginated_entries, many=True)
            return paginator.get_paginated_response(serializer.data)

        serializer = EntrySerializer(neighbors_qs, many=True)
        return Response(serializer.data)


class GraphInaccessibleView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        source_id = request.query_params.get("src")
        if not source_id:
            return Response({"error": "Missing src parameter."}, status=400)

        try:
            depth = int(request.query_params.get("depth", 1))
        except ValueError:
            return Response({"error": "depth must be integer."}, status=400)

        if depth < 1 or depth > 4:
            return Response({"error": "depth must be between 1 and 4."}, status=400)

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

        neighbors_qs = get_neighbors(
            {source_entry.id}, depth, None
        )  # Queryset of all neighbors

        entities = neighbors_qs.filter(entry_class__type=EntryType.ENTITY)

        inaccessible = Access.objects.inaccessible_entries(
            request.user, entities, {AccessType.READ, AccessType.READ_WRITE}
        )

        return Response({"inaccessible": [entry.id for entry in inaccessible]})


class FetchGraphView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        edges = (
            Edge.objects.accessible(request.user)
            .remove_mirrors()
            .order_by("-last_seen")
        )

        try:
            page_size = int(request.query_params.get("page_size", 200))
        except ValueError:
            return Response({"error": "page_size must be integer."}, status=400)

        paginator = LazyPaginator(page_size=page_size)
        paginated_edges = paginator.paginate_queryset(edges, request)

        entry_ids = set()

        for i in paginated_edges:
            entry_ids.add(i.src)
            entry_ids.add(i.dst)

        entries = Entry.objects.filter(id__in=entry_ids)

        colors = {}

        for i in entries.all():
            if i.entry_class_id not in colors:
                colors[i.entry_class_id] = i.entry_class.color

        serializer = SubGraphSerializer(
            {"relations": paginated_edges, "entries": entries, "colors": colors}
        )

        return paginator.get_paginated_response(serializer.data)
