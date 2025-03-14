from django.db.models import Q
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from typing import cast
from entries.enums import EntryType
from entries.models import EntryClass
from drf_spectacular.utils import extend_schema, extend_schema_view

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
                                    "options": {"type": "array", "items": {"type": "string"}},
                                    "description": {"type": "string"},
                                    "icon": {"type": "string"},
                                    "color": {"type": "string"}
                                }
                            }
                        }
                    }
                }
            },
            401: {"description": "User is not authenticated"}
        }
    )
)
class LspTypes(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        queryset = EntryClass.objects.filter(~Q(subtype="alias"))
        serializer = LspEntryClassSerializer(queryset, many=True)

        grouped_data = {}
        for item in serializer.data:
            subtype = item.get("subtype")
            grouped_data[subtype] = item

        return Response(grouped_data)

@extend_schema_view(
    get=extend_schema(
        summary="Get LSP Completion Trie",
        description="Returns LSP completion trie data for entity types and types without regex/options. "
                   "Used for autocomplete suggestions in the LSP interface.",
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
                                    "description": "Trie structure containing completion data"
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
                                            "options": {"type": "array", "items": {"type": "string"}},
                                            "description": {"type": "string"},
                                            "icon": {"type": "string"},
                                            "color": {"type": "string"}
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            401: {"description": "User is not authenticated"}
        }
    )
)

class CompletionTrie(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        user: CradleUser = cast(CradleUser, request.user)
        classes = EntryClass.objects.filter(
            Q(type=EntryType.ENTITY) | (Q(regex="") & Q(options=""))
        )

        return Response(LspUtils.get_lsp_pack(user, classes))
