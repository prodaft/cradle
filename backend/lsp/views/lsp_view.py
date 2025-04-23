from django.db.models import Q
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from typing import cast
from entries.enums import EntryType
from entries.models import EntryClass
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view

from lsp.serializers import LspEntryClassSerializer
from ..utils import LspUtils
from user.models import CradleUser


@extend_schema_view(
    get=extend_schema(
        summary="Get LSP Types",
        description="Returns LSP type definitions grouped by subtype, excluding aliases.",
        responses={
            200: {
                "description": "Successful retrieval of LSP types",
                "content": {
                    "application/json": {
                        "schema": {
                            "type": "object",
                            "additionalProperties": {
                                "type": "object",
                                "properties": {
                                    "id": {"type": "integer"},
                                    "type": {"type": "string"},
                                    "subtype": {"type": "string"},
                                    "regex": {"type": "string"},
                                    "options": {
                                        "type": "bool",
                                    },
                                    "description": {"type": "string"},
                                    "icon": {"type": "string"},
                                    "color": {"type": "string"},
                                },
                            },
                        }
                    }
                },
            },
            401: {"description": "User is not authenticated"},
        },
    )
)
class LspTypes(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        queryset = EntryClass.objects.filter(
            ~Q(subtype="alias") & ~Q(subtype="connector")
        )
        serializer = LspEntryClassSerializer(queryset, many=True)

        grouped_data = {}
        for item in serializer.data:
            subtype = item.get("subtype")
            grouped_data[subtype] = item

        return Response(grouped_data)


@extend_schema_view(
    get=extend_schema(
        summary="Get LSP Completion Trie",
        description="Returns LSP completion trie data for entity types and types without regex/options. "  # noqa: E501
        "Used for autocomplete suggestions in the LSP interface.",
        parameters=[
            OpenApiParameter(
                name="prefix",
                description="prefix text to filter completions (must be at least 4 characters if provided)",
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
                "content": {
                    "application/json": {
                        "schema": {
                            "type": "object",
                            "properties": {
                                "trie": {
                                    "type": "object",
                                    "description": "Trie structure containing completion data",  # noqa: E501
                                },
                                "classes": {
                                    "type": "object",
                                    "description": "Entry class definitions",
                                    "additionalProperties": {
                                        "type": "object",
                                        "properties": {
                                            "id": {"type": "integer"},
                                            "type": {"type": "string"},
                                            "subtype": {"type": "string"},
                                            "regex": {"type": "string"},
                                            "description": {"type": "string"},
                                            "icon": {"type": "string"},
                                            "color": {"type": "string"},
                                        },
                                    },
                                },
                            },
                        }
                    }
                },
            },
            400: {"description": "Bad request - prefix parameter is too short"},
            401: {"description": "User is not authenticated"},
        },
    )
)
class CompletionTrie(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        user: CradleUser = cast(CradleUser, request.user)

        prefix = request.query_params.get("prefix")
        entry_type = request.query_params.get("type")

        if prefix:
            if len(prefix) < 3:
                return Response(
                    {"error": "prefix parameter must be at least 3 characters long"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if entry_type:
                # Get entry class with matching subtype
                entry_class = (
                    EntryClass.objects.filter(subtype=entry_type)
                    .filter(Q(options="") & Q(regex=""))
                    .first()
                )

                if entry_class:
                    return Response(LspUtils.get_lsp_pack(user, [entry_class], prefix))
                else:
                    return Response(
                        {"error": "Invalid entry type"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

        # Default behavior if conditions aren't met
        classes = EntryClass.objects.filter(Q(type=EntryType.ENTITY) | ~Q(options=""))
        return Response(LspUtils.get_lsp_pack(user, classes))
