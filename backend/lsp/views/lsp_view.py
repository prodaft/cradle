from django.db.models import Q
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from typing import cast
from entries.enums import EntryType
from entries.models import EntryClass
from drf_spectacular.utils import extend_schema

from lsp.serializers import LspEntryClassSerializer
from ..utils import LspUtils
from user.models import CradleUser


class LspTypes(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        queryset = EntryClass.objects.all()
        serializer = LspEntryClassSerializer(queryset, many=True)

        grouped_data = {}
        for item in serializer.data:
            subtype = item.get("subtype")
            grouped_data[subtype] = item

        return Response(grouped_data)


class CompletionTrie(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        user: CradleUser = cast(CradleUser, request.user)
        classes = EntryClass.objects.filter(
            Q(type=EntryType.ENTITY) | (Q(regex="") & Q(options=""))
        )

        return Response(LspUtils.get_lsp_pack(user, classes))
