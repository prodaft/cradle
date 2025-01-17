from django.db.models import F, Q
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.request import Request
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.permissions import IsAuthenticated
from entries.models import EntryClass
from notes.models import Note, Relation
from user.models import CradleUser
from .serializers import GraphQueryRequestSerializer, KnowledgeGraphSerializer
from typing import cast

from rest_framework.parsers import JSONParser


class GraphTraverseView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request: Request) -> Response:
        query = GraphQueryRequestSerializer(
            data=request.data, context={"request": request}
        )
        query.is_valid(raise_exception=True)

        result = query.get_result()
        return Response(result)
