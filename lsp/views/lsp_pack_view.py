from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from typing import cast
from entries.models import EntryClass
from drf_spectacular.utils import extend_schema
from ..utils import LspUtils
from user.models import CradleUser


class LspPack(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    @extend_schema(
        description="Retrieve a packed list of entries, entities, and entry classes for the LSP (Language Server Protocol).",
        responses={
            200: "A JSON response containing packed LSP entries and entities",
            401: "User is not authenticated.",
            403: "Permission denied.",
        },
        summary="Get LSP Pack",
    )
    def get(self, request: Request) -> Response:
        user: CradleUser = cast(CradleUser, request.user)
        entries = LspUtils.get_lsp_entries(user)
        entities = LspUtils.get_entities(user)
        entry_classes = EntryClass.objects.all()

        return Response(LspUtils.entries_to_lsp_pack(entities | entries, entry_classes))
