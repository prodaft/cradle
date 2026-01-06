from django.db.models import Q
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import status
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from core.openapi import get_common_error_responses, get_error_responses
from core.pagination import TotalPagesPagination
from entries.enums import RelationReason

from ..exceptions import (
    EntriesErrorCodes,
    InvalidPageSizeException,
    InvalidRelatesParameterException,
    PageSizeTooLargeException,
    RelatesParameterRequiredException,
)
from ..models import Relation
from ..serializers import RelationDetailSerializer, RelationSerializer


@extend_schema(
    summary="List relations between entries",
    description="Returns a paginated list of relations between specified entries."
    + "Requires 'relates' query parameter with entry IDs.",
    parameters=[
        OpenApiParameter(
            name="relates",
            location=OpenApiParameter.QUERY,
            description="List of entry IDs to find relations between",
            required=True,
            type={"type": "array", "items": {"type": "integer"}},
        ),
        OpenApiParameter(
            name="page",
            location=OpenApiParameter.QUERY,
            description="Page number for pagination",
            required=False,
            type=int,
        ),
        OpenApiParameter(
            name="page_size",
            location=OpenApiParameter.QUERY,
            description="Number of relations to return per page",
            required=False,
            type=int,
        ),
    ],
    responses={
        200: TotalPagesPagination().get_paginated_response_serializer(
            RelationSerializer
        ),
        **get_error_responses(
            EntriesErrorCodes.RELATES_PARAMETER_REQUIRED,
            EntriesErrorCodes.INVALID_RELATES_PARAMETER,
            EntriesErrorCodes.INVALID_PAGE_SIZE,
            EntriesErrorCodes.PAGE_SIZE_TOO_LARGE,
        ),
        **get_common_error_responses(),
    },
)
class RelationListView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        page_size = request.query_params.get("page_size", 10)
        if not page_size.isdigit() or int(page_size) <= 0:
            raise InvalidPageSizeException(
                detail="Invalid page_size parameter. Must be a positive integer."
            )
        page_size = int(page_size)

        if page_size > 200:
            raise PageSizeTooLargeException(
                detail="page_size cannot be greater than 200."
            )

        raw_ids = request.query_params.getlist("relates")
        if not raw_ids:
            raise RelatesParameterRequiredException(
                detail="`relates` query parameter is required."
            )

        try:
            entry_ids = [int(e) for e in raw_ids]
        except ValueError:
            raise InvalidRelatesParameterException(
                detail="One or more `relates` values are not valid integers."
            )

        # Get relations where both e1 and e2 are in the provided list
        relations = Relation.objects.accessible(request.user).filter(
            ~Q(reason=RelationReason.NOTE) & Q(e1__in=entry_ids) & Q(e2__in=entry_ids)
        )

        paginator = TotalPagesPagination(page_size=page_size)
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
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Get relation details",
        description="Retrieves detailed information about a relation including its attachments with presigned URLs.",
        responses={
            200: RelationDetailSerializer,
            404: {"description": "Relation not found"},
            **get_common_error_responses(),
        },
    )
    def get(self, request, relation_id):
        """Get detailed relation information including attachments."""
        relation = get_object_or_404(
            Relation.objects.accessible(request.user).prefetch_related("attachments"),
            id=relation_id,
        )
        serializer = RelationDetailSerializer(relation)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        summary="Delete a relation",
        description="Deletes a specific relation by ID. Only admin users can perform this action.",
        responses={
            204: {"description": "No content - relation deleted successfully"},
            **get_common_error_responses(),
        },
    )
    def delete(self, request, relation_id):
        """Delete a relation (admin only)."""
        # Check admin permission explicitly for delete
        if not request.user.is_staff:
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied("Only admin users can delete relations.")

        relation = get_object_or_404(Relation, id=relation_id)
        relation.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
