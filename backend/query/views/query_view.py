from typing import cast
from uuid import UUID

from access.models import Access
from core.pagination import TotalPagesPagination
from django.db.models import Q, Subquery
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import OpenApiParameter, extend_schema
from entries.enums import EntryType
from entries.models import Entry
from entries.serializers import EntryResponseSerializer
from rest_framework import status
from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication
from user.authentication import APIKeyAuthentication

from query.filters import EntryFilter

from ..utils import parse_query


@extend_schema(
    summary="Query Entries",
    description="Allow a user to query entries they have access to by providing filters.",
    parameters=[
        OpenApiParameter(
            name="type",
            description="Filter by entry class type (exact match)",
            required=False,
            type=str,
        ),
        OpenApiParameter(
            name="subtype",
            description="Filter by entry class subtype.",
            required=False,
            many=True,
            type=str,
        ),
        OpenApiParameter(
            name="name",
            description="Filter by entry name (case-insensitive contains search)",
            required=False,
            type=str,
            many=True,
        ),
        OpenApiParameter(
            name="name_exact",
            description="Filter by exact entry name",
            required=False,
            many=True,
            type=str,
        ),
        OpenApiParameter(
            name="referenced_in",
            description="Filter by UUID of notes that reference this entry",
            required=False,
            type=str,
        ),
        OpenApiParameter(
            name="page",
            description="Pagination page number",
            required=False,
            type=int,
        ),
        OpenApiParameter(
            name="page_size",
            description="Number of results per page",
            required=False,
            type=int,
        ),
    ],
    responses={
        200: EntryResponseSerializer(many=True),
        401: {"description": "Unauthorized"},
    },
)
class EntryListQuery(ListAPIView):
    serializer_class = EntryResponseSerializer
    authentication_classes = [JWTAuthentication, APIKeyAuthentication]
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_class = EntryFilter
    pagination_class = TotalPagesPagination
    ordering = ["-last_seen"]

    def get_queryset(self):
        # Check if this is a schema generation request
        if getattr(self, "swagger_fake_view", False):
            return Entry.objects.none()

        accessible_entries = Entry.objects.accessible(self.request.user).non_virtual()
        if not self.request.user.is_cradle_admin:
            accessible_entries = accessible_entries.filter(
                Q(
                    entry_class__type=EntryType.ENTITY,
                    id__in=Subquery(
                        Access.objects.get_accessible_entity_ids(
                            cast(UUID, self.request.user.id)
                        )
                    ),
                )
                | Q(
                    entry_class__type=EntryType.ARTIFACT,
                )
            )
        return accessible_entries


class AdvancedQueryView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    # Add a queryset attribute to handle schema generation
    queryset = Entry.objects.none()

    @extend_schema(
        summary="Advanced Query Entries",
        description="Allow a user to query entries they have access to using advanced syntax:"
        + "`<subtype>:<name>` with wildcards and logical operators (&&, ||).",
        parameters=[
            OpenApiParameter(
                name="query",
                description="Advanced query string (e.g., 'type:name', '*:name', 'type:*', 'type:name && type2:name2')",
                required=True,
                many=True,
                type=str,
            ),
            OpenApiParameter(
                name="wildcard",
                description="Run the query as if there is a * at the end of it.",
                required=False,
                default=False,
                type=bool,
            ),
            OpenApiParameter(
                name="page",
                description="Pagination page number",
                required=False,
                type=int,
            ),
            OpenApiParameter(
                name="page_size",
                description="Number of results per page",
                required=False,
                type=int,
            ),
        ],
        responses={
            200: TotalPagesPagination().get_paginated_response_serializer(
                EntryResponseSerializer
            ),
            400: {"description": "Invalid query syntax"},
            401: {"description": "Unauthorized"},
        },
        request=None,
    )
    def get(self, request: Request) -> Response:
        # Check if this is a schema generation request
        if getattr(self, "swagger_fake_view", False):
            return Response([])

        page_size = request.query_params.get("page_size", 10)
        if not page_size.isdigit() or int(page_size) <= 0:
            return Response(
                {"error": "Invalid page_size parameter. Must be a positive integer."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        page_size = int(page_size)

        # Get the query parameter from the request
        queries = request.query_params.getlist("query", [])

        if request.query_params.get("wildcard") == "true":
            queries = [f"*{query}*" for query in queries]

        if not queries:
            query_filter = Q()
        else:
            query_filter = Q()
            for query_str in queries:
                if not query_str.strip():
                    continue
                try:
                    query_filter |= parse_query(query_str.strip())
                except Exception as e:
                    return Response(
                        {"error": f"Invalid query syntax: {str(e)}"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

        # Get accessible entries for the user
        accessible_entries = Entry.objects.accessible(request.user).non_virtual()
        if not request.user.is_cradle_admin:
            accessible_entries = accessible_entries.filter(
                Q(
                    entry_class__type=EntryType.ENTITY,
                    id__in=Subquery(
                        Access.objects.get_accessible_entity_ids(
                            cast(UUID, request.user.id)
                        )
                    ),
                )
                | Q(
                    entry_class__type=EntryType.ARTIFACT,
                )
            )

        # Apply the parsed query filter
        filtered_entries = accessible_entries.filter(query_filter)

        # Order and paginate the results
        filtered_entries = filtered_entries.order_by("-last_seen")
        paginator = TotalPagesPagination(page_size=page_size)
        paginated_entries = paginator.paginate_queryset(filtered_entries, request)

        # Serialize and return the response
        if paginated_entries is not None:
            serializer = EntryResponseSerializer(paginated_entries, many=True)
            return paginator.get_paginated_response(serializer.data)

        entry_serializer = EntryResponseSerializer(filtered_entries, many=True)
        return Response(entry_serializer.data, status=status.HTTP_200_OK)
