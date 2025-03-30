from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.pagination import PageNumberPagination
from django.shortcuts import get_object_or_404
from django.db.models import Q
from rest_framework_simplejwt.authentication import JWTAuthentication

from core.pagination import TotalPagesPagination
from entries.enums import RelationReason
from ..models import Relation
from ..serializers import RelationSerializer
from uuid import UUID


class RelationListView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        raw_ids = request.query_params.getlist("relates")
        if not raw_ids:
            return Response(
                {"detail": "`relates` query parameter is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            entry_ids = [UUID(e) for e in raw_ids]
        except ValueError:
            return Response(
                {"detail": "One or more `relates` values are not valid UUIDs."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Get relations where both e1 and e2 are in the provided list
        relations = Relation.objects.accessible(request.user).filter(
            ~Q(reason=RelationReason.NOTE) & Q(e1__in=entry_ids) & Q(e2__in=entry_ids)
        )

        paginator = TotalPagesPagination()
        paginated_entries = paginator.paginate_queryset(relations, request)

        # Serialize and return the response
        if paginated_entries is not None:
            serializer = RelationSerializer(paginated_entries, many=True)
            return paginator.get_paginated_response(serializer.data)

        entry_serializer = RelationSerializer(relations, many=True)
        return Response(entry_serializer.data, status=status.HTTP_200_OK)


class RelationDetailView(APIView):
    """
    Retrieve or delete a relation by ID.
    """

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsAdminUser]

    def delete(self, request, relation_id):
        relation = get_object_or_404(Relation, id=relation_id)
        relation.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
