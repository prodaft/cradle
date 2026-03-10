"""LSP API views: type definitions and completion trie."""

from typing import cast

from django.conf import settings
from django.db.models import Q
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view, inline_serializer
from rest_framework import serializers, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from core.exceptions import BadRequestException, CoreErrorCodes
from core.openapi import get_common_error_responses, get_error_responses
from entries.enums import EntryType
from entries.models import EntryClass
from user.models import CradleUser

from ..serializers import LspEntryClassSerializer
from ..utils import get_lsp_pack


@extend_schema_view(
    get=extend_schema(
        operation_id="lsp_types_retrieve",
        summary="Get LSP Types",
        description="Returns LSP type definitions grouped by subtype, excluding internal types (alias, note, file, digest, enrichment). Response is a map of subtype -> type definition.",
        responses={
            200: inline_serializer(
                name="LspTypesResponse",
                fields={
                    "types": serializers.DictField(
                        child=LspEntryClassSerializer(),
                        help_text="Map of subtype to type definition.",
                    )
                },
            ),
            **get_common_error_responses(),
        },
    )
)
class LspTypes(APIView):
    """Returns LSP type definitions (subtype -> type definition) for the editor."""

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        """Return types grouped by subtype, excluding internal types."""
        queryset = EntryClass.objects.filter(~Q(subtype__in=settings.INTERNAL_SUBTYPES))
        serializer = LspEntryClassSerializer(queryset, many=True)
        grouped_data = {item["subtype"]: item for item in serializer.data}
        return Response({"types": grouped_data}, status=status.HTTP_200_OK)


@extend_schema_view(
    get=extend_schema(
        operation_id="lsp_trie_retrieve",
        summary="Get LSP Completion Trie",
        description="Returns LSP completion trie data for entity types and types with options (excluding internal and regex-only types). Used for autocomplete suggestions in the LSP interface.",
        parameters=[
            OpenApiParameter(
                name="prefix",
                description="prefix text to filter completions (must be at least 3 characters if provided)",
                required=False,
                type=str,
            ),
            OpenApiParameter(
                name="type",
                description="Entry type to filter by",
                required=False,
                type=str,
            ),
        ],
        responses={
            200: {
                "description": "Successful retrieval of completion trie data",
            },
            **get_error_responses(CoreErrorCodes.BAD_REQUEST),
            **get_common_error_responses(),
        },
    )
)
class CompletionTrie(APIView):
    """Returns serialized completion tries for LSP autocomplete (entities and option-based types)."""

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        """Return completion trie(s) for the given prefix and optional type filter."""
        user: CradleUser = cast(CradleUser, request.user)

        prefix = request.query_params.get("prefix")
        entry_type = request.query_params.get("type")

        if prefix:
            if len(prefix) < 3:
                raise BadRequestException(detail="prefix parameter must be at least 3 characters long")

        if entry_type:
            try:
                entry_class = EntryClass.objects.get(subtype=entry_type)
            except EntryClass.DoesNotExist:
                raise BadRequestException(detail="Invalid entry type")
            if entry_type in settings.INTERNAL_SUBTYPES:
                raise BadRequestException(detail="Invalid entry type")
            if entry_class.format is not None:
                raise BadRequestException(detail="Invalid entry type")
            return Response(
                get_lsp_pack(user, [entry_class], prefix or ""),
                status=status.HTTP_200_OK,
            )

        classes = EntryClass.objects.filter(
            ~Q(subtype__in=settings.INTERNAL_SUBTYPES),
            Q(type=EntryType.ENTITY) | ~Q(options=""),
        )
        return Response(
            get_lsp_pack(user, classes, prefix or ""),
            status=status.HTTP_200_OK,
        )
