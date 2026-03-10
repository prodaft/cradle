"""Views for entities: list, create, retrieve, update, delete."""

from django.db import transaction
from django.db.utils import IntegrityError
from django.urls import reverse
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import status
from rest_framework.generics import ListCreateAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from access.enums import AccessType
from access.models import Access
from core.exceptions import CoreErrorCodes, PermissionDeniedException
from core.openapi import get_common_error_responses, get_error_responses
from core.pagination import TotalPagesPagination
from user.permissions import EntityDetailPermission, EntityListPermission

from ..exceptions import (
    AdminOnlyEntityPublicStatusException,
    DuplicateEntityException,
    EntityNotFoundException,
    EntriesErrorCodes,
)
from ..models import Entry
from ..serializers import EntitySerializer, EntryResponseSerializer
from ..tasks import refresh_edges_materialized_view


def _get_entity_or_404(entity_id: int) -> Entry:
    """Fetch entity by id or raise EntityNotFoundException."""
    try:
        return Entry.entities.get(pk=entity_id)
    except Entry.DoesNotExist:
        raise EntityNotFoundException(detail="There is no entity with the specified ID.")


@extend_schema_view(
    get=extend_schema(
        operation_id="entities_list",
        summary="List entities",
        description="Returns a paginated list of entities. For entry managers, returns only entities they have access to. For admin users, returns all entities.",  # noqa: E501
        parameters=[
            OpenApiParameter(
                name="page",
                type=int,
                location=OpenApiParameter.QUERY,
                description="Page number",
            ),
            OpenApiParameter(
                name="page_size",
                type=int,
                location=OpenApiParameter.QUERY,
                description="Number of results per page",
            ),
        ],
        responses={
            200: TotalPagesPagination().get_paginated_response_serializer(EntryResponseSerializer),
            **get_error_responses(
                CoreErrorCodes.INVALID_PAGE_SIZE,
                CoreErrorCodes.PAGE_SIZE_TOO_LARGE,
            ),
            **get_common_error_responses(),
        },
    ),
    post=extend_schema(
        operation_id="entities_create",
        summary="Create entity",
        description="Creates a new entity. Only available to admin users.",
        request=EntitySerializer,
        responses={
            201: EntitySerializer,
            **get_error_responses(
                EntriesErrorCodes.DUPLICATE_ENTITY,
                EntriesErrorCodes.ADMIN_ONLY_ENTITY_CREATE,
                CoreErrorCodes.PERMISSION_DENIED,
                include_validation_error=True,
            ),
            **get_common_error_responses(),
        },
    ),
)
class EntityList(ListCreateAPIView):
    """List or create entities. Admins see all; others see accessible only."""

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, EntityListPermission]
    pagination_class = TotalPagesPagination

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Entry.entities.none()
        if self.request.user.is_cradle_admin:
            return Entry.entities.all()
        return Entry.entities.filter(id__in=Access.objects.get_accessible_entity_ids(self.request.user.id))

    def get_serializer_class(self):
        if self.request.method == "POST":
            return EntitySerializer
        return EntryResponseSerializer

    def perform_create(self, serializer):
        name = serializer.validated_data.get("name")
        entry_class = serializer.validated_data.get("entry_class")
        try:
            with transaction.atomic():
                if Entry.entities.select_for_update().filter(name=name, entry_class=entry_class).exists():
                    raise DuplicateEntityException(detail=f"Entity with name '{name}' already exists")
                serializer.save()
                serializer.instance.log_create(self.request.user)
        except IntegrityError:
            raise DuplicateEntityException(detail=f"Entity with name '{name}' already exists")

        refresh_edges_materialized_view.apply_async()

    def get_success_headers(self, data):
        return {"Location": self.request.build_absolute_uri(reverse("entity_detail", kwargs={"entity_id": data["id"]}))}


@extend_schema_view(
    get=extend_schema(
        operation_id="entities_retrieve",
        summary="Get entity details",
        description="Returns details of a specific entity. Entry managers can only access entities they have permissions for. Admin users can access any entity.",  # noqa: E501
        parameters=[
            OpenApiParameter(
                name="entity_id",
                type=int,
                location=OpenApiParameter.PATH,
                description="Id of the entity",
            )
        ],
        responses={
            200: EntitySerializer,
            **get_error_responses(
                EntriesErrorCodes.ENTITY_NOT_FOUND,
                CoreErrorCodes.PERMISSION_DENIED,
            ),
            **get_common_error_responses(),
        },
    ),
    delete=extend_schema(
        operation_id="entities_destroy",
        summary="Delete entity",
        description="Deletes an entity. Only available to admin users.",
        parameters=[
            OpenApiParameter(
                name="entity_id",
                type=int,
                location=OpenApiParameter.PATH,
                description="Id of the entity to delete",
            )
        ],
        responses={
            204: {"description": "Entity successfully deleted"},
            **get_error_responses(
                EntriesErrorCodes.ADMIN_ONLY_ENTITY_DELETE,
                EntriesErrorCodes.ENTITY_NOT_FOUND,
                CoreErrorCodes.PERMISSION_DENIED,
            ),
            **get_common_error_responses(),
        },
    ),
    patch=extend_schema(
        operation_id="entities_update",
        summary="Update entity",
        description="Updates an existing entity.",
        request=EntitySerializer,
        parameters=[
            OpenApiParameter(
                name="entity_id",
                type=int,
                location=OpenApiParameter.PATH,
                description="Id of the entity to update",
            )
        ],
        responses={
            200: EntitySerializer,
            **get_error_responses(
                EntriesErrorCodes.ENTITY_NOT_FOUND,
                EntriesErrorCodes.ADMIN_ONLY_ENTITY_PUBLIC_STATUS,
                CoreErrorCodes.PERMISSION_DENIED,
                include_validation_error=True,
            ),
            **get_common_error_responses(),
        },
    ),
)
class EntityDetail(APIView):
    """Retrieve, update, or delete an entity."""

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, EntityDetailPermission]

    def get(self, request: Request, entity_id: int) -> Response:
        """Return entity details; requires access permission."""
        entity = _get_entity_or_404(entity_id)
        if not (request.user.is_cradle_admin or Access.objects.user_has_entity_access(request.user.id, entity_id)):
            raise PermissionDeniedException(detail="You do not have access to this entity.")

        serializer = EntitySerializer(entity)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def delete(self, request: Request, entity_id: int) -> Response:
        """Delete entity and remap note links (admin only)."""
        entity = _get_entity_or_404(entity_id)
        entity.delete_renaming(request.user.id)
        refresh_edges_materialized_view.apply_async()

        return Response(status=status.HTTP_204_NO_CONTENT)

    def patch(self, request: Request, entity_id: int) -> Response:
        """Update entity; is_public change requires admin."""
        entity = _get_entity_or_404(entity_id)
        if not (Access.objects.has_access_to_entities(request.user, {entity}, {AccessType.READ_WRITE})):
            raise PermissionDeniedException(detail="You do not have write access to this entity.")

        serializer = EntitySerializer(entity, data=request.data)
        serializer.is_valid(raise_exception=True)

        # Non-Admin cannot change public status of entity
        if (
            serializer.validated_data.get("is_public", entity.is_public) != entity.is_public
            and not request.user.is_cradle_admin
        ):
            raise AdminOnlyEntityPublicStatusException(detail="Only admins can change the public status of entities!")

        with transaction.atomic():
            serializer.save()
            serializer.instance.log_edit(request.user)

        refresh_edges_materialized_view.apply_async()

        return Response(serializer.data, status=status.HTTP_200_OK)
