"""Enrichment API views: settings, requests, relations, restart."""

import uuid

from django.db import transaction
from django.db.models import Q
from django.urls import reverse
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import status
from rest_framework.generics import GenericAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from core.exceptions import CoreErrorCodes, PermissionDeniedException
from core.openapi import get_common_error_responses, get_error_responses
from core.pagination import TotalPagesPagination
from core.utils import validate_order_by
from core.validators import validate_choice_param, validate_optional_int_param
from entries.models import Entry
from query.exceptions import InvalidSearchSyntaxException, QueryErrorCodes
from query.utils import parse_query
from user.authentication import APIKeyAuthentication
from user.permissions import HasAdminRole

from ..constants import (
    INTELIO_ENRICHMENT_MESSAGE_ACTION_DENIED,
    INTELIO_ENRICHMENT_MESSAGE_ACTION_DENIED_DEFAULT,
)
from ..enums import EnrichmentStatus
from ..exceptions import (
    EnrichmentNotFoundException,
    EnrichmentOptionNotFoundException,
    IntelIOErrorCodes,
    UnknownEnrichmentOptionException,
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


class EnrichmentRequestObjectMixin:
    """Mixin for views that need to fetch EnrichmentRequest by pk with access control."""

    enrichment_prefetch = ("enrichers_settings", "entities")

    def get_enrichment_request(self, pk, user):
        """Return EnrichmentRequest by pk if user has access, else None."""
        if user.is_cradle_admin:
            queryset = EnrichmentRequest.objects.all()
        else:
            queryset = EnrichmentRequest.objects.get_accessible_by(user)
        try:
            return queryset.prefetch_related(*self.enrichment_prefetch).get(pk=pk)
        except EnrichmentRequest.DoesNotExist:
            return None

    def _check_owner_or_admin(self, enrichment_request, user, action: str):
        """Raise PermissionDeniedException if user is not owner or admin."""
        if enrichment_request.user != user and not user.is_cradle_admin:
            detail = INTELIO_ENRICHMENT_MESSAGE_ACTION_DENIED.get(
                action,
                INTELIO_ENRICHMENT_MESSAGE_ACTION_DENIED_DEFAULT,
            )
            raise PermissionDeniedException(detail=detail)

    def _verify_enricher_type(self, enrichment_request, enricher_type: str):
        """Raise EnrichmentOptionNotFoundException if enricher_type is not in this request."""
        enricher_types = [s.enricher_type for s in enrichment_request.enrichers_settings.all()]
        if enricher_type not in enricher_types:
            raise EnrichmentOptionNotFoundException(detail="That option is not part of this enrichment.")


@extend_schema_view(
    get=extend_schema(
        operation_id="enrichment_subclasses_list",
        summary="Get enrichment subclasses",
        description="Returns a list of all subclasses of BaseEnricher with their names.",
        parameters=[
            OpenApiParameter(
                name="search",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Search enrichment types by name or class name",
                required=False,
            ),
        ],
        responses={
            200: EnrichmentSubclassSerializer(many=True),
            **get_common_error_responses(),
        },
    )
)
class EnrichmentSubclassesAPIView(APIView):
    """DRF API view that returns all BaseEnricher subclasses with their names."""

    authentication_classes = [JWTAuthentication, APIKeyAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request: Request, *args, **kwargs) -> Response:
        subclasses = BaseEnricher.__subclasses__()

        enabled_enrichers = set(EnricherSettings.objects.filter(enabled=True).values_list("enricher_type", flat=True))

        subclass_data = [
            {
                "class": subclass.__name__,
                "name": subclass.display_name,
                "enabled": subclass.__name__ in enabled_enrichers,
            }
            for subclass in subclasses
            if hasattr(subclass, "display_name")
        ]

        search = request.query_params.get("search")
        if search:
            search_lower = search.lower()
            subclass_data = [
                s for s in subclass_data if search_lower in s["name"].lower() or search_lower in s["class"].lower()
            ]

        serializer = EnrichmentSubclassSerializer(subclass_data, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


@extend_schema_view(
    get=extend_schema(
        operation_id="enrichment_settings_retrieve",
        summary="Get enrichment settings",
        description="Get enrichment settings for a specific enricher type.",
        responses={
            200: EnrichmentSettingsSerializer,
            **get_error_responses(IntelIOErrorCodes.UNKNOWN_ENRICHMENT_OPTION),
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
            **get_error_responses(
                IntelIOErrorCodes.UNKNOWN_ENRICHMENT_OPTION,
                include_validation_error=True,
            ),
            **get_common_error_responses(),
        },
    ),
)
class EnrichmentSettingsAPIView(GenericAPIView):
    """Get, create and update enrichment settings."""

    authentication_classes = [JWTAuthentication, APIKeyAuthentication]
    permission_classes = [IsAuthenticated, HasAdminRole]
    serializer_class = EnrichmentSettingsSerializer

    def get(self, request: Request, enricher_type: str) -> Response:
        enricher = get_or_default_enricher(enricher_type)

        if enricher is None:
            raise UnknownEnrichmentOptionException(detail="That enrichment option could not be found.")

        return Response(self.get_serializer(enricher).data, status=status.HTTP_200_OK)

    def post(self, request: Request, enricher_type: str) -> Response:
        enricher = get_or_default_enricher(enricher_type)
        if enricher is None:
            raise UnknownEnrichmentOptionException(detail="That enrichment option could not be found.")

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
                name="any_value",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Filter by title and username (case-insensitive partial match)",
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
                name="entry_id",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Filter by entries that have results for this entry",
                required=False,
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
            200: TotalPagesPagination().get_paginated_response_serializer(EnrichmentRequestListSerializer),
            **get_error_responses(
                CoreErrorCodes.INVALID_PAGE_SIZE,
                CoreErrorCodes.PAGE_SIZE_TOO_LARGE,
                CoreErrorCodes.INVALID_REQUEST,
            ),
            **get_common_error_responses(),
        },
    ),
    post=extend_schema(
        operation_id="enrichment_request_create",
        summary="Create enrichment request",
        description=(
            "Create a new enrichment request. Required: enricher_names, title, and exactly one artifact "
            "(the `artifact` object and/or notes that resolve to a single enrichable entry). "
            "`entities` is optional and scopes which other users can see the request."
        ),
        request=EnrichmentRequestSerializer,
        responses={
            201: EnrichmentRequestSerializer,
            **get_error_responses(include_validation_error=True),
            **get_common_error_responses(),
        },
    ),
)
class EnrichmentAPIView(APIView):
    """API view for enrichment-related actions.

    GET: List all enrichment requests for the current user with filtering and pagination.
    POST: Create a new enrichment request (optional entity IDs for access scope).
    """

    authentication_classes = [JWTAuthentication, APIKeyAuthentication]
    permission_classes = [IsAuthenticated]
    serializer_class = EnrichmentRequestSerializer
    pagination_class = TotalPagesPagination

    def get(self, request: Request) -> Response:
        """List enrichment requests with optional filters, sorting, and pagination."""
        if request.user.is_cradle_admin:
            queryset = EnrichmentRequest.objects.all()
        else:
            queryset = EnrichmentRequest.objects.get_accessible_by(request.user)

        # Filter by user username
        user_username = request.query_params.get("user__username")
        if user_username:
            queryset = queryset.filter(user__username__icontains=user_username)

        # Filter by title
        title = request.query_params.get("title")
        if title:
            queryset = queryset.filter(title__icontains=title)

        any_value = request.query_params.get("any_value")
        if any_value:
            queryset = queryset.filter(Q(title__icontains=any_value) | Q(user__username__icontains=any_value))

        entry_id = validate_optional_int_param(request.query_params.get("entry_id"), param_name="entry_id")
        if entry_id is not None:
            try:
                entry = Entry.objects.get(id=entry_id)
                queryset = queryset.filter(Q(relations__e1=entry) | Q(relations__e2=entry))
            except Entry.DoesNotExist:
                queryset = queryset.filter(id__in=[])

        # Handle ordering
        order_by = request.query_params.get("order_by", "-created_at")
        valid_order_fields = [
            "created_at",
            "title",
            "user__username",
            "status",
        ]

        # Parse and validate order_by parameter
        order_fields = validate_order_by(order_by, valid_order_fields)
        if order_fields:
            queryset = queryset.order_by(*order_fields)
        else:
            queryset = queryset.order_by("-created_at")

        status_val = validate_choice_param(
            request.query_params.get("status"),
            [c[0] for c in EnrichmentStatus.choices],
            param_name="status",
        )
        if status_val:
            queryset = queryset.filter(status=status_val)

        queryset = queryset.select_related("user").prefetch_related("enrichers_settings")

        # Apply pagination (max 100 for enrichment)
        paginator = self.pagination_class(max_page_size=100)
        page = paginator.paginate_queryset(queryset, request)

        serializer = EnrichmentRequestListSerializer(page, many=True, context={"request": request})
        return paginator.get_paginated_response(serializer.data)

    def post(self, request: Request, *args, **kwargs) -> Response:
        """Create a new enrichment request."""
        serializer = EnrichmentRequestSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            enrichment_request = serializer.save()
        location = request.build_absolute_uri(reverse("enrichment_detail", kwargs={"pk": enrichment_request.id}))
        return Response(
            EnrichmentRequestSerializer(enrichment_request, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
            headers={"Location": location},
        )


@extend_schema_view(
    get=extend_schema(
        operation_id="enrichment_detail_retrieve",
        summary="Retrieve enrichment request details",
        description="Retrieve detailed information about a specific enrichment request including enricher types, entries requested, warnings, and errors.",
        responses={
            200: EnrichmentRequestDetailSerializer,
            **get_error_responses(
                IntelIOErrorCodes.ENRICHMENT_NOT_FOUND,
                CoreErrorCodes.PERMISSION_DENIED,
            ),
            **get_common_error_responses(),
        },
    ),
    delete=extend_schema(
        operation_id="enrichment_detail_delete",
        summary="Delete enrichment request",
        description="Delete a specific enrichment request. Only the owner or admin can delete an enrichment request.",
        responses={
            204: None,
            **get_error_responses(
                IntelIOErrorCodes.ENRICHMENT_NOT_FOUND,
                CoreErrorCodes.PERMISSION_DENIED,
            ),
            **get_common_error_responses(),
        },
    ),
)
class EnrichmentDetailAPIView(EnrichmentRequestObjectMixin, APIView):
    """API view for retrieving detailed information about a specific enrichment request.

    GET: Retrieve enrichment request details.
    DELETE: Delete an enrichment request.
    """

    authentication_classes = [JWTAuthentication, APIKeyAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request: Request, pk: uuid.UUID) -> Response:
        """Retrieve enrichment request details."""
        enrichment_request = self.get_enrichment_request(pk, request.user)

        if enrichment_request is None:
            raise EnrichmentNotFoundException(detail="That enrichment could not be found.")

        self._check_owner_or_admin(enrichment_request, request.user, "view")
        serializer = EnrichmentRequestDetailSerializer(enrichment_request)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def delete(self, request: Request, pk: uuid.UUID) -> Response:
        """Delete an enrichment request."""
        enrichment_request = self.get_enrichment_request(pk, request.user)

        if enrichment_request is None:
            raise EnrichmentNotFoundException(detail="That enrichment could not be found.")

        self._check_owner_or_admin(enrichment_request, request.user, "delete")
        with transaction.atomic():
            enrichment_request.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema_view(
    post=extend_schema(
        operation_id="enrichment_restart",
        summary="Restart enrichment request",
        description="Restart a specific enrichment request by resetting its status and rerunning the enrichment process. Only the owner or admin can restart an enrichment request.",
        responses={
            200: EnrichmentRequestDetailSerializer,
            **get_error_responses(
                IntelIOErrorCodes.ENRICHMENT_NOT_FOUND,
                CoreErrorCodes.PERMISSION_DENIED,
            ),
            **get_common_error_responses(),
        },
    ),
)
class EnrichmentRestartAPIView(EnrichmentRequestObjectMixin, APIView):
    """API view for restarting an enrichment request.

    POST: Restart an enrichment request.
    """

    authentication_classes = [JWTAuthentication, APIKeyAuthentication]
    permission_classes = [IsAuthenticated]
    serializer_class = EnrichmentRequestDetailSerializer

    def post(self, request: Request, pk: uuid.UUID) -> Response:
        """Restart an enrichment request."""
        enrichment_request = self.get_enrichment_request(pk, request.user)

        if enrichment_request is None:
            raise EnrichmentNotFoundException(detail="That enrichment could not be found.")

        self._check_owner_or_admin(enrichment_request, request.user, "restart")
        with transaction.atomic():
            # Reset the enrichment request state
            enrichment_request.status = EnrichmentStatus.WAITING
            enrichment_request.errors = {}
            enrichment_request.warnings = {}
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
        return Response(serializer.data, status=status.HTTP_200_OK)


@extend_schema_view(
    get=extend_schema(
        operation_id="enrichment_request_enricher_retrieve",
        summary="Retrieve enrichment request enricher information",
        description="Retrieve detailed information about a specific enrichment request enricher.",
        responses={
            200: EnrichmentRequestEnricherSerializer,
            **get_error_responses(
                IntelIOErrorCodes.ENRICHMENT_NOT_FOUND,
                IntelIOErrorCodes.ENRICHMENT_OPTION_NOT_FOUND,
                CoreErrorCodes.PERMISSION_DENIED,
            ),
            **get_common_error_responses(),
        },
    ),
)
class EnrichmentRequestEnricherAPIView(EnrichmentRequestObjectMixin, APIView):
    """API view for retrieving enrichment request enricher information.

    GET: Retrieve enrichment request enricher information.
    """

    authentication_classes = [JWTAuthentication, APIKeyAuthentication]
    permission_classes = [IsAuthenticated]
    serializer_class = EnrichmentRequestEnricherSerializer
    enrichment_prefetch = ("enrichers_settings",)

    def get(self, request: Request, pk: uuid.UUID, enricher_type: str) -> Response:
        """Retrieve enrichment request enricher information."""
        enrichment_request = self.get_enrichment_request(pk, request.user)

        if enrichment_request is None:
            raise EnrichmentNotFoundException(detail="That enrichment could not be found.")

        self._check_owner_or_admin(enrichment_request, request.user, "view")
        self._verify_enricher_type(enrichment_request, enricher_type)

        # Get enricher information
        serializer = EnrichmentRequestEnricherSerializer.for_enrichment(enrichment_request, enricher_type)
        return Response(serializer.data, status=status.HTTP_200_OK)


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
                name="entry_id",
                type=int,
                location=OpenApiParameter.QUERY,
                description="Filter by entry ID",
                required=False,
            ),
            OpenApiParameter(
                name="query",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Advanced entry filter (parse_query syntax; ignored if `search` is set)",
                required=False,
            ),
            OpenApiParameter(
                name="details",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Filter by details, matched with a simple contains search (ignored if `search` is set)",
                required=False,
            ),
            OpenApiParameter(
                name="search",
                type=str,
                location=OpenApiParameter.QUERY,
                description=(
                    "Substring match on either endpoint's name or subtype, or on JSON `details` "
                    "(case-insensitive). When set, `query` and `details` are ignored."
                ),
                required=False,
            ),
        ],
        responses={
            200: TotalPagesPagination().get_paginated_response_serializer(EnrichmentRelationSerializer),
            **get_error_responses(
                IntelIOErrorCodes.ENRICHMENT_NOT_FOUND,
                IntelIOErrorCodes.ENRICHMENT_OPTION_NOT_FOUND,
                CoreErrorCodes.PERMISSION_DENIED,
                CoreErrorCodes.INVALID_PAGE_SIZE,
                CoreErrorCodes.PAGE_SIZE_TOO_LARGE,
                CoreErrorCodes.INVALID_REQUEST,
                QueryErrorCodes.INVALID_SEARCH_SYNTAX,
            ),
            **get_common_error_responses(),
        },
    ),
)
class EnrichmentRelationsAPIView(EnrichmentRequestObjectMixin, APIView):
    """API view for relations created by an enrichment request, filtered by enricher type.

    GET: Retrieve relations for a specific enricher type.
    """

    authentication_classes = [JWTAuthentication, APIKeyAuthentication]
    permission_classes = [IsAuthenticated]
    pagination_class = TotalPagesPagination
    enrichment_prefetch = ("enrichers_settings",)

    def get(self, request: Request, pk: uuid.UUID, enricher_type: str) -> Response:
        """Retrieve relations created by an enrichment request filtered by enricher type."""
        enrichment_request = self.get_enrichment_request(pk, request.user)

        if enrichment_request is None:
            raise EnrichmentNotFoundException(detail="That enrichment could not be found.")

        self._check_owner_or_admin(enrichment_request, request.user, "view")
        self._verify_enricher_type(enrichment_request, enricher_type)

        # Get relations associated with this enrichment request and enricher type
        relations = enrichment_request.relations.filter(reason_context=enricher_type)

        entry_id = validate_optional_int_param(request.query_params.get("entry_id"), param_name="entry_id")
        if entry_id is not None:
            relations = relations.filter(Q(e1__id=entry_id) | Q(e2__id=entry_id))

        search = (request.query_params.get("search") or "").strip()
        if search:
            relations = relations.filter(
                Q(e1__name__icontains=search)
                | Q(e2__name__icontains=search)
                | Q(e1__entry_class__subtype__icontains=search)
                | Q(e2__entry_class__subtype__icontains=search)
                | Q(details__icontains=search),
            )
        else:
            query_str = request.query_params.get("query")
            if query_str:
                try:
                    query_filter = parse_query(query_str + "*")
                except ValueError as e:
                    raise InvalidSearchSyntaxException(
                        detail="Use a colon between the entry type and name (for example, *:note or author:Smith)."
                    ) from e

                entries_qs = Entry.objects.filter(query_filter)
                relations = relations.filter(Q(e1__in=entries_qs) | Q(e2__in=entries_qs))

            details = request.query_params.get("details")
            if details:
                relations = relations.filter(details__icontains=details)

        relations = relations.order_by("id")
        # Optimize query
        relations = relations.select_related("e1", "e2")

        # Apply pagination (max 100 for enrichment)
        paginator = self.pagination_class(max_page_size=100)
        page = paginator.paginate_queryset(relations, request)

        serializer = EnrichmentRelationSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)
