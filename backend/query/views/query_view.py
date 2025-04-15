from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.request import Request
from rest_framework import status
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q, Subquery
from typing import cast

from entries.models import Entry
from access.models import Access
from query.filters import EntryFilter
from core.pagination import TotalPagesPagination
from drf_spectacular.utils import extend_schema, OpenApiParameter
from entries.serializers import EntryResponseSerializer
from uuid import UUID
from entries.enums import EntryType
from ..utils import parse_query


class EntryListQuery(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Query Entries",
        description="Allow a user to query entries they have access to by providing a name, type, or other filters.",
        parameters=[
            OpenApiParameter(
                name="name",
                description="Filter by entry name",
                required=False,
                type=str,
            ),
            OpenApiParameter(
                name="subtype",
                description="Filter by entry subtype",
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
            401: "Unauthorized",
        },
        request=None,
    )
    def get(self, request: Request) -> Response:
        accessible_entries = Entry.objects.accessible(request.user).all()
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

        filterset = EntryFilter(request.query_params, queryset=accessible_entries)

        if filterset.is_valid():
            entries = filterset.qs
            entries = entries.order_by("-last_seen")
            paginator = TotalPagesPagination(page_size=10)
            paginated_entries = paginator.paginate_queryset(entries, request)

            if paginated_entries is not None:
                serializer = EntryResponseSerializer(paginated_entries, many=True)
                return paginator.get_paginated_response(serializer.data)

            entry_serializer = EntryResponseSerializer(entries, many=True)

            return Response(entry_serializer.data, status=status.HTTP_200_OK)
        else:
            return Response(filterset.errors, status=status.HTTP_400_BAD_REQUEST)


class AdvancedQueryView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Advanced Query Entries",
        description="Allow a user to query entries they have access to using advanced syntax:"
        + "`<subtype>:<name>` with wildcards and logical operators (&&, ||).",
        parameters=[
            OpenApiParameter(
                name="query",
                description="Advanced query string (e.g., 'type:name', '*:name', 'type:*', 'type:name && type2:name2')",
                required=True,
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
            200: EntryResponseSerializer(many=True),
            400: "Invalid query syntax",
            401: "Unauthorized",
        },
        request=None,
    )
    def get(self, request: Request) -> Response:
        # Get the query parameter from the request
        query_str = request.query_params.get("query")

        if request.query_params.get("wildcard") == "true":
            query_str = "*" + query_str + "*"

        if not query_str:
            query_filter = Q()
        else:
            try:
                query_filter = parse_query(query_str)
            except Exception as e:
                return Response(
                    {"error": f"Invalid query syntax: {str(e)}"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # Get accessible entries for the user
        accessible_entries = Entry.objects.accessible(request.user).all()
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
        paginator = TotalPagesPagination()
        paginated_entries = paginator.paginate_queryset(filtered_entries, request)

        # Serialize and return the response
        if paginated_entries is not None:
            serializer = EntryResponseSerializer(paginated_entries, many=True)
            return paginator.get_paginated_response(serializer.data)

        entry_serializer = EntryResponseSerializer(filtered_entries, many=True)
        return Response(entry_serializer.data, status=status.HTTP_200_OK)
