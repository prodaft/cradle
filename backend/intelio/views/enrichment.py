from core.pagination import TotalPagesPagination
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from entries.serializers import RelationSerializer
from rest_framework import status
from rest_framework.generics import GenericAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication
from user.permissions import HasAdminRole

from ..models.base import BaseEnricher, EnricherSettings, EnrichmentRequest
from ..serializers import (
    EnrichmentRequestSerializer,
    EnrichmentSettingsSerializer,
    EnrichmentSubclassSerializer,
)
from ..utils import get_or_default_enricher


@extend_schema_view(
    get=extend_schema(
        operation_id="enrichment_subclasses_list",
        summary="Get enrichment subclasses",
        description="Returns a list of all subclasses of BaseEnricher with their names.",
        responses={
            200: EnrichmentSubclassSerializer(many=True),
            401: {"description": "User is not authenticated"},
            403: {"description": "User does not have admin role"},
        },
    )
)
class EnrichmentSubclassesAPIView(APIView):
    """
    DRF API view that returns a list of all subclasses of Enricment
    with their names.
    """

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        subclasses = BaseEnricher.__subclasses__()

        enabled_enrichers = set(
            EnricherSettings.objects.filter(enabled=True).values_list(
                "enricher_type", flat=True
            )
        )

        subclass_data = [
            {
                "class": subclass.__name__,
                "name": subclass.display_name,
                "enabled": subclass.__name__ in enabled_enrichers,
            }
            for subclass in subclasses
            if hasattr(subclass, "display_name")
        ]

        serializer = EnrichmentSubclassSerializer(subclass_data, many=True)
        return Response(serializer.data)


@extend_schema_view(
    get=extend_schema(
        operation_id="enrichment_settings_retrieve",
        summary="Get enrichment settings",
        description="Get enrichment settings for a specific enricher type.",
        responses={
            200: EnrichmentSettingsSerializer,
            404: {"description": "Enricher type not found"},
        },
    ),
    post=extend_schema(
        operation_id="enrichment_settings_update",
        summary="Update enrichment settings",
        description="Create or update enrichment settings for a specific enricher type.",
        request=EnrichmentSettingsSerializer,
        responses={
            200: EnrichmentSettingsSerializer,
            404: {"description": "Enricher type not found"},
            400: {"description": "Bad request"},
        },
    ),
)
class EnrichmentSettingsAPIView(GenericAPIView):
    """
    Get, create and update enrichment settings
    """

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, HasAdminRole]
    serializer_class = EnrichmentSettingsSerializer

    def get(self, request, enricher_type):
        enricher = get_or_default_enricher(enricher_type)

        if enricher is None:
            return Response(
                {"detail": "Enricher type not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(self.get_serializer(enricher).data)

    def post(self, request, enricher_type):
        enricher = get_or_default_enricher(enricher_type)
        if enricher is None:
            return Response(
                {"detail": "Enricher type not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = self.get_serializer(enricher, data=request.data, partial=True)

        if serializer.is_valid():
            serializer.save(enricher_type=enricher_type)
            return Response(serializer.data, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema_view(
    get=extend_schema(
        operation_id="enrichment_request_list",
        summary="List enrichment requests",
        description="Returns a list of all enrichment requests for the current user or entity.",
        responses={
            200: EnrichmentRequestSerializer(many=True),
            401: {"description": "User is not authenticated"},
        },
    ),
    post=extend_schema(
        operation_id="enrichment_request_create",
        summary="Create enrichment request",
        description=(
            "Create a new enrichment request for an entity. "
            "Required fields: enricher_name, entity, title, and request."
        ),
        request=EnrichmentRequestSerializer,
        responses={
            201: EnrichmentRequestSerializer,
            400: {"description": "Invalid request data"},
            401: {"description": "User is not authenticated"},
        },
    ),
)
class EnrichmentAPIView(APIView):
    """
    API view for enrichment-related actions.

    GET: List all enrichment requests for the current user or filtered by entity.
    POST: Create a new enrichment request for an entity.
    """

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    serializer_class = EnrichmentRequestSerializer

    def get(self, request):
        """List enrichment requests with optional entity filter"""
        entity_id = request.query_params.get("entity")

        if entity_id:
            enrichment_requests = EnrichmentRequest.objects.filter(
                entity_id=entity_id
            ).order_by("-created_at")
        else:
            # Default to user's requests
            enrichment_requests = EnrichmentRequest.objects.filter(
                user=request.user
            ).order_by("-created_at")

        serializer = EnrichmentRequestSerializer(
            enrichment_requests, many=True, context={"request": request}
        )
        return Response(serializer.data)

    def post(self, request, *args, **kwargs):
        """Create a new enrichment request"""
        serializer = EnrichmentRequestSerializer(
            data=request.data, context={"request": request}
        )

        if serializer.is_valid():
            enrichment_request = serializer.save()
            return Response(
                EnrichmentRequestSerializer(
                    enrichment_request, context={"request": request}
                ).data,
                status=status.HTTP_201_CREATED,
            )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema_view(
    get=extend_schema(
        operation_id="enrichment_relations_retrieve",
        summary="Retrieve relations created by enrichment",
        description="Retrieve the relations created by a specific enrichment request.",
        parameters=[
            OpenApiParameter(
                name="page_size",
                type=int,
                location=OpenApiParameter.QUERY,
                description="Number of relations to return per page. Max 100.",
                default=10,
            ),
            OpenApiParameter(
                name="page",
                type=int,
                location=OpenApiParameter.QUERY,
                description="Page number for pagination",
            ),
            OpenApiParameter(
                name="order_by",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Order relations by field(s). Prefix with '-' for descending order. Multiple fields can be separated by commas. Valid fields: created_at, last_seen, reason. Default: -created_at",
                required=False,
                default="-created_at",
            ),
        ],
        responses={
            200: TotalPagesPagination().get_paginated_response_serializer(
                RelationSerializer
            ),
            401: {"description": "User is not authenticated"},
            403: {"description": "Forbidden - insufficient permissions"},
            404: {"description": "Enrichment request not found"},
        },
    ),
)
class EnrichmentDetailAPIView(APIView):
    """
    API view for retrieving relations created by a specific enrichment request.

    GET: Retrieve relations created by a specific enrichment request.
    """

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get_object(self, pk):
        try:
            return EnrichmentRequest.objects.get(pk=pk)
        except EnrichmentRequest.DoesNotExist:
            return None

    def get(self, request, pk):
        """Retrieve relations created by an enrichment request"""
        from core.utils import validate_order_by
        from entries.serializers import RelationSerializer

        enrichment_request = self.get_object(pk)

        if enrichment_request is None:
            return Response(
                {"detail": "Enrichment request not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Check if user has access to this request
        if enrichment_request.user != request.user and not request.user.is_staff:
            return Response(
                {
                    "detail": "You don't have permission to view this enrichment request."
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        # Get relations associated with this enrichment request
        relations = enrichment_request.relations.all()

        # Handle page_size parameter
        try:
            page_size = int(request.query_params.get("page_size", 10))
        except ValueError:
            return Response(
                "Invalid page_size value. Must be an integer.",
                status=status.HTTP_400_BAD_REQUEST,
            )

        if page_size > 100:
            return Response(
                "page_size cannot be greater than 100.",
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Handle ordering
        order_by = request.query_params.get("order_by", "-created_at")
        valid_order_fields = [
            "created_at",
            "last_seen",
            "reason",
        ]

        # Parse and validate order_by parameter
        order_fields, error_response = validate_order_by(order_by, valid_order_fields)
        if error_response:
            return error_response

        if order_fields:
            relations = relations.order_by(*order_fields)
        else:
            relations = relations.order_by("-created_at")

        # Apply pagination
        paginator = TotalPagesPagination(page_size=page_size)
        result_page = paginator.paginate_queryset(relations, request)

        serializer = RelationSerializer(result_page, many=True)
        return paginator.get_paginated_response(serializer.data)
