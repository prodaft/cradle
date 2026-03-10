"""Query API views for entry list and advanced query."""

from django.db.models import Q, Subquery
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import status
from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from access.models import Access
from core.exceptions import CoreErrorCodes
from core.openapi import get_common_error_responses, get_error_responses
from core.pagination import TotalPagesPagination
from core.validators import validate_str_list_param
from entries.enums import EntryType
from entries.models import Entry
from entries.serializers import EntryResponseSerializer
from user.authentication import APIKeyAuthentication

from ..exceptions import InvalidQuerySyntaxException, QueryErrorCodes
from ..filters import EntryFilter
from ..utils import parse_query


def _get_accessible_entries(user):
    """Base queryset of entries accessible to the user, with access control applied."""
    qs = (
        Entry.objects.accessible(user)
        .non_virtual()
        .select_related("entry_class")
        .prefetch_related("entry_class__children")
    )
    if not user.is_cradle_admin:
        qs = qs.filter(
            Q(
                entry_class__type=EntryType.ENTITY,
                id__in=Subquery(Access.objects.get_accessible_entity_ids(user.id)),
            )
            | Q(entry_class__type=EntryType.ARTIFACT)
        )
    return qs


@extend_schema(
    summary="Query Entries",
    description="Allow a user to query entries they have access to by providing filters.",
    responses={
        200: TotalPagesPagination().get_paginated_response_serializer(
            EntryResponseSerializer, name="EntryQueryPaginatedResponse"
        ),
        **get_error_responses(
            CoreErrorCodes.INVALID_PAGE_SIZE,
            CoreErrorCodes.PAGE_SIZE_TOO_LARGE,
        ),
        **get_common_error_responses(),
    },
)
class EntryListQuery(ListAPIView):
    """List entries with filters (type, subtype, name, search, referenced_in)."""

    serializer_class = EntryResponseSerializer
    authentication_classes = [JWTAuthentication, APIKeyAuthentication]
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_class = EntryFilter
    pagination_class = TotalPagesPagination
    ordering = ["-last_seen"]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Entry.objects.none()
        return _get_accessible_entries(self.request.user)


class AdvancedQueryView(APIView):
    """Advanced query with subtype:name syntax and wildcards."""

    authentication_classes = [JWTAuthentication, APIKeyAuthentication]
    permission_classes = [IsAuthenticated]
    pagination_class = TotalPagesPagination

    # Add a queryset attribute to handle schema generation
    queryset = Entry.objects.none()

    @extend_schema(
        summary="Advanced Query Entries",
        description="Allow a user to query entries they have access to using advanced syntax: "
        "<subtype>:<name> with wildcards (*). Multiple query params are OR'd.",
        parameters=[
            OpenApiParameter(
                name="query",
                description="Advanced query string (e.g., 'type:name', '*:name', 'type:*')",
                required=False,
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
                EntryResponseSerializer, name="AdvancedQueryPaginatedResponse"
            ),
            **get_error_responses(
                CoreErrorCodes.INVALID_PAGE_SIZE,
                CoreErrorCodes.PAGE_SIZE_TOO_LARGE,
                CoreErrorCodes.INVALID_REQUEST,
                QueryErrorCodes.INVALID_QUERY_SYNTAX,
            ),
            **get_common_error_responses(),
        },
        request=None,
    )
    def get(self, request: Request) -> Response:
        # Check if this is a schema generation request
        if getattr(self, "swagger_fake_view", False):
            return Response(
                {"page": 1, "count": 0, "total_pages": 1, "results": []},
                status=status.HTTP_200_OK,
            )

        raw_queries = request.query_params.getlist("query", [])
        queries = validate_str_list_param(raw_queries, param_name="query", max_length=50)

        if request.query_params.get("wildcard") == "true":
            queries = [f"{query}*" for query in queries]

        query_filter = Q()
        for query_str in queries:
            if not query_str.strip():
                continue
            try:
                query_filter |= parse_query(query_str.strip())
            except ValueError as e:
                raise InvalidQuerySyntaxException(detail=f"Invalid query syntax: {str(e)}")

        accessible_entries = _get_accessible_entries(request.user)

        # Apply the parsed query filter
        filtered_entries = accessible_entries.filter(query_filter)

        # Order and paginate the results
        filtered_entries = filtered_entries.order_by("-last_seen")
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(filtered_entries, request)

        # Serialize and return the response
        serializer = EntryResponseSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)
