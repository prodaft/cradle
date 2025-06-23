from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.db.models import Q
from rest_framework_simplejwt.authentication import JWTAuthentication
from drf_spectacular.utils import extend_schema, OpenApiParameter

from core.pagination import TotalPagesPagination
from entries.enums import RelationReason
from ..models import Relation
from ..serializers import RelationSerializer


@extend_schema(
    summary="List relations between entries",
    description="Returns a paginated list of relations between specified entries. Requires 'relates' query parameter with entry IDs.",
    parameters=[
        OpenApiParameter(
            name="relates",
            location=OpenApiParameter.QUERY,
            description="List of entry IDs to find relations between",
            required=True,
            type={"type": "array", "items": {"type": "integer"}},
        )
    ],
    responses={
        200: RelationSerializer(many=True),
        400: {"description": "Bad request - invalid parameters"},
        401: {"description": "User is not authenticated"},
    },
)
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
            entry_ids = [int(e) for e in raw_ids]
        except ValueError:
            return Response(
                {"detail": "One or more `relates` values are not valid integers."},
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


@extend_schema(
    summary="Delete a relation",
    description="Deletes a specific relation by ID. Only admin users can perform this action.",
    responses={
        204: {"description": "No content - relation deleted successfully"},
        404: {"description": "Relation not found"},
        401: {"description": "User is not authenticated"},
        403: {"description": "User is not authorized to delete relations"},
    },
)
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
