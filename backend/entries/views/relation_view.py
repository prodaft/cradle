"""Views for relations: list by entry IDs, retrieve or delete by UUID."""

from uuid import UUID

from django.db.models import Q
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from core.exceptions import CoreErrorCodes, InvalidRequestException
from core.openapi import get_common_error_responses, get_error_responses
from core.pagination import TotalPagesPagination
from core.validators import validate_int_list_param
from user.permissions import HasAdminRole

from ..enums import RelationReason
from ..exceptions import (
    EntriesErrorCodes,
    InvalidRelatesParameterException,
    RelatesParameterRequiredException,
    RelationNotFoundException,
)
from ..models import Relation
from ..serializers import RelationDetailSerializer, RelationSerializer


class RelationListView(APIView):
    """List relations between specified entries (requires 'relates' query param)."""

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    pagination_class = TotalPagesPagination

    @extend_schema(
        summary="List relations between entries",
        description="Returns a paginated list of relations between specified entries. "
        "Requires 'relates' query parameter with entry IDs.",
        operation_id="entries_relations_list",
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
            200: TotalPagesPagination().get_paginated_response_serializer(RelationSerializer),
            **get_error_responses(
                EntriesErrorCodes.RELATES_PARAMETER_REQUIRED,
                EntriesErrorCodes.INVALID_RELATES_PARAMETER,
                CoreErrorCodes.INVALID_PAGE_SIZE,
                CoreErrorCodes.PAGE_SIZE_TOO_LARGE,
            ),
            **get_common_error_responses(),
        },
    )
    def get(self, request: Request) -> Response:
        """Return paginated relations where both e1 and e2 are in relates."""
        raw_ids = request.query_params.getlist("relates")
        if not raw_ids:
            raise RelatesParameterRequiredException(detail="`relates` query parameter is required.")

        try:
            entry_ids = validate_int_list_param(raw_ids, param_name="relates", max_length=100)
        except InvalidRequestException as e:
            detail = (
                e.detail[0]
                if isinstance(e.detail, list) and e.detail
                else (str(e.detail) if e.detail else "Invalid relates parameter.")
            )
            raise InvalidRelatesParameterException(detail=detail)

        # Get relations where both e1 and e2 are in the provided list
        relations = (
            Relation.objects.accessible(request.user)
            .filter(~Q(reason=RelationReason.NOTE) & Q(e1__in=entry_ids) & Q(e2__in=entry_ids))
            .select_related("e1__entry_class", "e2__entry_class")
        )

        paginator = self.pagination_class()
        page = paginator.paginate_queryset(relations, request)
        serializer = RelationSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)


@extend_schema_view(
    get=extend_schema(
        operation_id="entries_relations_retrieve",
        summary="Get relation details",
        description="Retrieves detailed information about a relation including its attachments with presigned URLs.",
        parameters=[
            OpenApiParameter(
                name="relation_id",
                type=UUID,
                location=OpenApiParameter.PATH,
                description="UUID of the relation",
            ),
        ],
        responses={
            200: RelationDetailSerializer,
            **get_error_responses(EntriesErrorCodes.RELATION_NOT_FOUND),
            **get_common_error_responses(),
        },
    ),
    delete=extend_schema(
        operation_id="entries_relations_destroy",
        summary="Delete a relation",
        description="Deletes a specific relation by ID. Only admin users can perform this action.",
        parameters=[
            OpenApiParameter(
                name="relation_id",
                type=UUID,
                location=OpenApiParameter.PATH,
                description="UUID of the relation",
            ),
        ],
        responses={
            204: {"description": "Relation deleted successfully"},
            **get_error_responses(EntriesErrorCodes.RELATION_NOT_FOUND),
            **get_common_error_responses(),
        },
    ),
)
class RelationDetailView(APIView):
    """Retrieve or delete a relation by ID."""

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.request.method == "DELETE":
            return [IsAuthenticated(), HasAdminRole()]
        return super().get_permissions()

    def get(self, request: Request, relation_id: UUID) -> Response:
        """Get detailed relation information including attachments."""
        try:
            relation = Relation.objects.accessible(request.user).prefetch_related("attachments").get(id=relation_id)
        except Relation.DoesNotExist:
            raise RelationNotFoundException(detail="Relation not found.")
        serializer = RelationDetailSerializer(relation)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def delete(self, request: Request, relation_id: UUID) -> Response:
        """Delete a relation (admin only)."""
        try:
            relation = Relation.objects.accessible(request.user).get(id=relation_id)
        except Relation.DoesNotExist:
            raise RelationNotFoundException(detail="Relation not found.")
        relation.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
