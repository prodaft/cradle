"""NDJSON stream list endpoints (single HTTP connection, chunked body)."""

from django.db.models import Count
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema, extend_schema_view
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from access.models import Access
from core.ndjson import ndjson_streaming_response
from core.openapi import get_common_error_responses, get_error_responses
from user.permissions import EntityListPermission, EntryClassListPermission

from ..exceptions import AdminOnlyViewCountException, EntriesErrorCodes
from ..filters import EntryClassFilter
from ..models import Entry, EntryClass
from ..serializers import EntryClassSerializer, EntryClassSerializerCount, EntryResponseSerializer


@extend_schema_view(
    get=extend_schema(
        operation_id="entities_list_stream",
        summary="Stream entities (NDJSON)",
        description=(
            "Returns all entities the caller may list as newline-delimited JSON (one object per line). "
            "Same permission rules as the paginated list; uses a single chunked HTTP response."
        ),
        responses={
            200: OpenApiResponse(
                description="``application/x-ndjson`` body: one JSON object per line (same shape as list items)."
            ),
            **get_common_error_responses(),
        },
    ),
)
class EntityListStreamView(APIView):
    """Stream entities as NDJSON."""

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, EntityListPermission]

    def get(self, request: Request):
        if getattr(self, "swagger_fake_view", False):
            return ndjson_streaming_response(iter(()))

        if request.user.is_cradle_admin:
            qs = Entry.entities.all()
        else:
            qs = Entry.entities.filter(id__in=Access.objects.get_accessible_entity_ids(request.user.id))
        qs = qs.select_related("entry_class")

        serializer = EntryResponseSerializer()

        def rows():
            for instance in qs.iterator(chunk_size=200):
                yield serializer.to_representation(instance)

        return ndjson_streaming_response(rows())


@extend_schema_view(
    get=extend_schema(
        operation_id="entry_classes_list_stream",
        summary="Stream entry classes (NDJSON)",
        description=(
            "Returns all entry classes as NDJSON (one object per line). "
            "Supports the same ``search`` and ``show_count`` query parameters as the paginated list."
        ),
        parameters=[
            OpenApiParameter(
                name="show_count",
                type=bool,
                location=OpenApiParameter.QUERY,
                description="Annotate entry counts (admin only, same as paginated list).",
            ),
            OpenApiParameter(
                name="search",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Filter by subtype or description (substring).",
            ),
        ],
        responses={
            200: OpenApiResponse(
                description="``application/x-ndjson`` body: one JSON object per line (same shape as list items)."
            ),
            **get_error_responses(
                EntriesErrorCodes.ADMIN_ONLY_VIEW_COUNT,
            ),
            **get_common_error_responses(),
        },
    ),
)
class EntryClassListStreamView(APIView):
    """Stream entry classes as NDJSON."""

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, EntryClassListPermission]

    def get(self, request: Request):
        if getattr(self, "swagger_fake_view", False):
            return ndjson_streaming_response(iter(()))

        qs = EntryClass.objects.prefetch_related("children")
        if request.query_params.get("show_count") == "true":
            if not request.user.is_cradle_admin:
                raise AdminOnlyViewCountException(detail="Only administrators can view the entry type count.")
            qs = qs.annotate(entry_count=Count("entries"))

        qs = EntryClassFilter(request.GET, queryset=qs).qs

        if request.query_params.get("show_count") == "true":
            serializer = EntryClassSerializerCount()
        else:
            serializer = EntryClassSerializer()

        def rows():
            for instance in qs.iterator(chunk_size=200):
                yield serializer.to_representation(instance)

        return ndjson_streaming_response(rows())
