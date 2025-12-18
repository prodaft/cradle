from django.db.models import Q
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import status
from rest_framework.generics import GenericAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from core.openapi import (
    get_common_error_responses,
    get_error_responses,
    get_validation_error_response,
)
from core.pagination import TotalPagesPagination
from entries.models import Entry
from query.exceptions import InvalidQuerySyntaxException
from query.utils import parse_query
from user.permissions import HasAdminRole

from ..enums import EnrichmentStatus
from ..exceptions import (
    EnricherNotFoundException,
    EnricherTypeNotFoundException,
    EnrichmentRequestNotFoundException,
    IntelioErrorCodes,
    InvalidPageSizeException,
    PageSizeTooLargeException,
    PermissionDeniedException,
)
from ..models.base import BaseEnricher, EnricherSettings, EnrichmentRequest
from ..serializers import (
    EnrichmentRelationSerializer,
    EnrichmentRequestDetailSerializer,
    EnrichmentRequestEnricherSerializer,
    EnrichmentRequestListSerializer,
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
            **get_common_error_responses(),
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
            **get_error_responses(IntelioErrorCodes.ENRICHER_NOT_FOUND),
            **get_common_error_responses(),
        },
    ),
    post=extend_schema(
        operation_id="enrichment_settings_update",
        summary="Update enrichment settings",
        description="Create or update enrichment settings for a specific enricher type.",
        request=EnrichmentSettingsSerializer,
        responses={
            200: EnrichmentSettingsSerializer,
            **get_error_responses(IntelioErrorCodes.ENRICHER_NOT_FOUND),
            **get_validation_error_response(),
            **get_common_error_responses(),
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
            raise EnricherNotFoundException(detail="Enricher type not found.")

        return Response(self.get_serializer(enricher).data)

    def post(self, request, enricher_type):
        enricher = get_or_default_enricher(enricher_type)
        if enricher is None:
            raise EnricherNotFoundException(detail="Enricher type not found.")

        serializer = self.get_serializer(enricher, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save(enricher_type=enricher_type)
        return Response(serializer.data, status=status.HTTP_200_OK)


@extend_schema_view(
    get=extend_schema(
        operation_id="enrichment_request_list",
        summary="List enrichment requests",
        description="Returns a paginated list of enrichment requests for the current user. Can filter by user and title. Results are ordered by created_at descending.",
        parameters=[
            OpenApiParameter(
                name="user__username",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Filter by user username (case-insensitive partial match)",
                required=False,
            ),
            OpenApiParameter(
                name="title",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Filter by title (case-insensitive partial match)",
                required=False,
            ),
            OpenApiParameter(
                name="page_size",
                type=int,
                location=OpenApiParameter.QUERY,
                description="Number of enrichment requests to return per page. Max 100.",
                default=10,
            ),
            OpenApiParameter(
                name="status",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Filter by status",
                enum=list(map(lambda x: x[0], EnrichmentStatus.choices)),
                required=False,
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
                description="Order enrichment requests by field(s). Prefix with '-' for descending order. Multiple fields can be separated by commas. Valid fields: created_at, title, user__username, status. Default: -created_at",
                required=False,
                default="-created_at",
            ),
        ],
        responses={
            200: TotalPagesPagination().get_paginated_response_serializer(
                EnrichmentRequestListSerializer
            ),
            **get_error_responses(
                IntelioErrorCodes.INVALID_PAGE_SIZE,
                IntelioErrorCodes.PAGE_SIZE_TOO_LARGE,
            ),
            **get_common_error_responses(),
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
            **get_validation_error_response(),
            **get_common_error_responses(),
        },
    ),
)
class EnrichmentAPIView(APIView):
    """
    API view for enrichment-related actions.

    GET: List all enrichment requests for the current user with filtering and pagination.
    POST: Create a new enrichment request for an entity.
    """

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    serializer_class = EnrichmentRequestSerializer

    def get(self, request):
        """List enrichment requests with optional filters, sorting, and pagination"""
        from core.utils import validate_order_by

        if request.user.is_cradle_admin:
            queryset = EnrichmentRequest.objects.all()
        else:
            queryset = EnrichmentRequest.objects.get_accessible_by(request.user)

        # Handle page_size parameter
        try:
            page_size = int(request.query_params.get("page_size", 10))
        except ValueError:
            raise InvalidPageSizeException(
                detail="Invalid page_size value. Must be an integer."
            )

        if page_size > 100:
            raise PageSizeTooLargeException(
                detail="page_size cannot be greater than 100."
            )

        # Filter by user username
        user_username = request.query_params.get("user__username")
        if user_username:
            queryset = queryset.filter(user__username__icontains=user_username)

        # Filter by title
        title = request.query_params.get("title")
        if title:
            queryset = queryset.filter(title__icontains=title)

        # Handle ordering
        order_by = request.query_params.get("order_by", "-created_at")
        valid_order_fields = [
            "created_at",
            "title",
            "user__username",
            "status",
        ]

        # Parse and validate order_by parameter
        order_fields, error_response = validate_order_by(order_by, valid_order_fields)
        if error_response:
            return error_response

        if order_fields:
            queryset = queryset.order_by(*order_fields)
        else:
            queryset = queryset.order_by("-created_at")

        if request.query_params.get("status"):
            queryset = queryset.filter(status=request.query_params.get("status"))

        queryset = queryset.select_related("user").prefetch_related(
            "enrichers_settings"
        )

        # Apply pagination
        paginator = TotalPagesPagination(page_size=page_size)
        result_page = paginator.paginate_queryset(queryset, request)

        serializer = EnrichmentRequestListSerializer(
            result_page, many=True, context={"request": request}
        )
        return paginator.get_paginated_response(serializer.data)

    def post(self, request, *args, **kwargs):
        """Create a new enrichment request"""
        serializer = EnrichmentRequestSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        enrichment_request = serializer.save()
        return Response(
            EnrichmentRequestSerializer(
                enrichment_request, context={"request": request}
            ).data,
            status=status.HTTP_201_CREATED,
        )


@extend_schema_view(
    get=extend_schema(
        operation_id="enrichment_detail_retrieve",
        summary="Retrieve enrichment request details",
        description="Retrieve detailed information about a specific enrichment request including enricher types, entries requested, warnings, and errors.",
        responses={
            200: EnrichmentRequestDetailSerializer,
            **get_error_responses(
                IntelioErrorCodes.ENRICHMENT_REQUEST_NOT_FOUND,
                IntelioErrorCodes.PERMISSION_DENIED,
            ),
            **get_common_error_responses(),
        },
    ),
    delete=extend_schema(
        operation_id="enrichment_detail_delete",
        summary="Delete enrichment request",
        description="Delete a specific enrichment request. Only the owner or staff can delete an enrichment request.",
        responses={
            204: None,
            **get_error_responses(
                IntelioErrorCodes.ENRICHMENT_REQUEST_NOT_FOUND,
                IntelioErrorCodes.PERMISSION_DENIED,
            ),
            **get_common_error_responses(),
        },
    ),
)
class EnrichmentDetailAPIView(APIView):
    """
    API view for retrieving detailed information about a specific enrichment request.

    GET: Retrieve enrichment request details.
    DELETE: Delete an enrichment request.
    """

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get_object(self, pk):
        try:
            return EnrichmentRequest.objects.prefetch_related(
                "enrichers_settings", "entities"
            ).get(pk=pk)
        except EnrichmentRequest.DoesNotExist:
            return None

    def get(self, request, pk):
        """Retrieve enrichment request details"""
        enrichment_request = self.get_object(pk)

        if enrichment_request is None:
            raise EnrichmentRequestNotFoundException(
                detail="Enrichment request not found."
            )

        # Check if user has access to this request
        if enrichment_request.user != request.user and not request.user.is_staff:
            raise PermissionDeniedException(
                detail="You don't have permission to view this enrichment request."
            )

        serializer = EnrichmentRequestDetailSerializer(enrichment_request)
        return Response(serializer.data)

    def delete(self, request, pk):
        """Delete an enrichment request"""
        enrichment_request = self.get_object(pk)

        if enrichment_request is None:
            raise EnrichmentRequestNotFoundException(
                detail="Enrichment request not found."
            )

        # Check if user has access to this request
        if enrichment_request.user != request.user and not request.user.is_staff:
            raise PermissionDeniedException(
                detail="You don't have permission to delete this enrichment request."
            )

        enrichment_request.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema_view(
    post=extend_schema(
        operation_id="enrichment_restart",
        summary="Restart enrichment request",
        description="Restart a specific enrichment request by resetting its status and rerunning the enrichment process. Only the owner or staff can restart an enrichment request.",
        responses={
            200: EnrichmentRequestDetailSerializer,
            **get_error_responses(
                IntelioErrorCodes.ENRICHMENT_REQUEST_NOT_FOUND,
                IntelioErrorCodes.PERMISSION_DENIED,
            ),
            **get_common_error_responses(),
        },
    ),
)
class EnrichmentRestartAPIView(APIView):
    """
    API view for restarting an enrichment request.

    POST: Restart an enrichment request.
    """

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    serializer_class = EnrichmentRequestDetailSerializer

    def get_object(self, pk):
        try:
            return EnrichmentRequest.objects.prefetch_related(
                "enrichers_settings", "entities"
            ).get(pk=pk)
        except EnrichmentRequest.DoesNotExist:
            return None

    def post(self, request, pk):
        """Restart an enrichment request"""
        enrichment_request = self.get_object(pk)

        if enrichment_request is None:
            raise EnrichmentRequestNotFoundException(
                detail="Enrichment request not found."
            )

        # Check if user has access to this request
        if enrichment_request.user != request.user and not request.user.is_staff:
            raise PermissionDeniedException(
                detail="You don't have permission to restart this enrichment request."
            )

        # Reset the enrichment request state
        enrichment_request.status = EnrichmentStatus.WAITING
        enrichment_request.errors = []
        enrichment_request.warnings = []
        enrichment_request.enricher_status = {}
        enrichment_request.completed_at = None
        enrichment_request.save(
            update_fields=[
                "status",
                "errors",
                "warnings",
                "enricher_status",
                "completed_at",
            ]
        )

        # Start the enrichment process
        enrichment_request.start_enrichment()

        # Return the updated enrichment request
        serializer = EnrichmentRequestDetailSerializer(enrichment_request)
        return Response(serializer.data)


@extend_schema_view(
    get=extend_schema(
        operation_id="enrichment_request_enricher_retrieve",
        summary="Retrieve enrichment request enricher information",
        description="Retrieve detailed information about a specific enrichment request enricher.",
        responses={
            200: EnrichmentRequestEnricherSerializer,
            **get_error_responses(
                IntelioErrorCodes.ENRICHMENT_REQUEST_NOT_FOUND,
                IntelioErrorCodes.PERMISSION_DENIED,
            ),
            **get_common_error_responses(),
        },
    ),
)
class EnrichmentRequestEnricherAPIView(APIView):
    """
    API view for retrieving enrichment request enricher information.

    GET: Retrieve enrichment request enricher information.
    """

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    serializer_class = EnrichmentRequestEnricherSerializer

    def get_object(self, pk):
        try:
            return EnrichmentRequest.objects.prefetch_related("enrichers_settings").get(
                pk=pk
            )
        except EnrichmentRequest.DoesNotExist:
            return None

    def get(self, request, pk, enricher_type):
        """Retrieve enrichment request enricher information"""
        enrichment_request = self.get_object(pk)

        if enrichment_request is None:
            raise EnrichmentRequestNotFoundException(
                detail="Enrichment request not found."
            )

        # Check if user has access to this request
        if enrichment_request.user != request.user and not request.user.is_staff:
            raise PermissionDeniedException(
                detail="You don't have permission to view this enrichment request."
            )

        # Verify enricher_type is valid for this enrichment request
        enricher_types = [
            settings.enricher_type
            for settings in enrichment_request.enrichers_settings.all()
        ]
        if enricher_type not in enricher_types:
            raise EnricherTypeNotFoundException(
                detail=f"Enricher type '{enricher_type}' not found in this enrichment request."
            )

        # Get enricher information
        enricher = enrichment_request.enrichers.get(enricher_type)

        serializer = EnrichmentRequestEnricherSerializer.for_enrichment(enricher)
        return Response(serializer.data)


@extend_schema_view(
    get=extend_schema(
        operation_id="enrichment_relations_retrieve",
        summary="Retrieve relations created by enrichment",
        description="Retrieve the relations created by a specific enrichment request, filtered by enricher type.",
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
                name="query",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Filter by entry name or subclass, supports wildcard queries",
                required=False,
            ),
            OpenApiParameter(
                name="details",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Filter by details, matched with a simple contains search",
                required=False,
            ),
        ],
        responses={
            200: TotalPagesPagination().get_paginated_response_serializer(
                EnrichmentRelationSerializer
            ),
            **get_error_responses(
                IntelioErrorCodes.ENRICHMENT_REQUEST_NOT_FOUND,
                IntelioErrorCodes.ENRICHER_TYPE_NOT_FOUND,
                IntelioErrorCodes.PERMISSION_DENIED,
                IntelioErrorCodes.INVALID_PAGE_SIZE,
                IntelioErrorCodes.PAGE_SIZE_TOO_LARGE,
            ),
            **get_common_error_responses(),
        },
    ),
)
class EnrichmentRelationsAPIView(APIView):
    """
    API view for retrieving relations created by a specific enrichment request,
    filtered by enricher type.

    GET: Retrieve relations created by an enrichment request with a specific enricher type.
    """

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get_object(self, pk):
        try:
            return EnrichmentRequest.objects.prefetch_related("enrichers_settings").get(
                pk=pk
            )
        except EnrichmentRequest.DoesNotExist:
            return None

    def get(self, request, pk, enricher_type):
        """Retrieve relations created by an enrichment request filtered by enricher type"""

        enrichment_request = self.get_object(pk)

        if enrichment_request is None:
            raise EnrichmentRequestNotFoundException(
                detail="Enrichment request not found."
            )

        # Check if user has access to this request
        if enrichment_request.user != request.user and not request.user.is_staff:
            raise PermissionDeniedException(
                detail="You don't have permission to view this enrichment request."
            )

        # Verify enricher_type is valid for this enrichment request
        enricher_types = [
            settings.enricher_type
            for settings in enrichment_request.enrichers_settings.all()
        ]
        if enricher_type not in enricher_types:
            raise EnricherTypeNotFoundException(
                detail=f"Enricher type '{enricher_type}' not found in this enrichment request."
            )

        # Get relations associated with this enrichment request and enricher type
        relations = enrichment_request.relations.filter(reason_context=enricher_type)

        # Handle page_size parameter
        try:
            page_size = int(request.query_params.get("page_size", 10))
        except ValueError:
            raise InvalidPageSizeException(
                detail="Invalid page_size value. Must be an integer."
            )

        if page_size > 100:
            raise PageSizeTooLargeException(
                detail="page_size cannot be greater than 100."
            )

        query_str = request.query_params.get("query") + "*"
        if query_str:
            try:
                query_filter = parse_query(query_str)
            except Exception as e:
                raise InvalidQuerySyntaxException(
                    detail=f"Invalid query syntax: {str(e)}"
                )

            entries_qs = Entry.objects.filter(query_filter)
            relations = relations.filter(Q(e1__in=entries_qs) | Q(e2__in=entries_qs))

        details = request.query_params.get("details")
        if details:
            relations = relations.filter(details__icontains=details)

        relations = relations.order_by("id")
        # Optimize query
        relations = relations.select_related("e1", "e2")

        # Apply pagination
        paginator = TotalPagesPagination(page_size=page_size)
        result_page = paginator.paginate_queryset(relations, request)

        serializer = EnrichmentRelationSerializer(result_page, many=True)
        return paginator.get_paginated_response(serializer.data)
