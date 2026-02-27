from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from access.enums import AccessType
from access.models import Access
from core.openapi import (
    get_common_error_responses,
    get_error_responses,
    get_validation_error_response,
)
from entries.tasks import refresh_edges_materialized_view
from user.permissions import HasEntryManagerRole

from ..exceptions import (
    AdminOnlyEntityDeleteException,
    AdminOnlyEntityPublicStatusException,
    DuplicateEntityException,
    EntityNotFoundException,
    EntriesErrorCodes,
)
from ..models import Entry
from ..serializers import EntitySerializer, EntryResponseSerializer


@extend_schema_view(
    get=extend_schema(
        operation_id="entities_list",
        summary="List entities",
        description="Returns a list of entities. For regular users, returns only entities they have access to. For admin users, returns all entities.",  # noqa: E501
        responses={
            200: EntryResponseSerializer(many=True),
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
            **get_validation_error_response(),
            **get_error_responses(
                EntriesErrorCodes.DUPLICATE_ENTITY,
            ),
            **get_common_error_responses(),
        },
    ),
)
class EntityList(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, HasEntryManagerRole]

    def get(self, request: Request) -> Response:
        if request.user.is_cradle_admin:
            entities = Entry.entities.all()
        else:
            entities = Entry.objects.filter(id__in=Access.objects.get_accessible_entity_ids(request.user))

        serializer = EntryResponseSerializer(entities, many=True)
        return Response(serializer.data)

    def post(self, request: Request) -> Response:
        """Creates a new entity. Only available to admin users."""
        serializer = EntitySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Check if entity already exists
        name = serializer.validated_data.get("name")
        if Entry.entities.filter(name=name).exists():
            raise DuplicateEntityException(detail=f"Entity with name '{name}' already exists")

        # Create new entity
        serializer.save()

        # Log entity creation
        serializer.instance.log_create(request.user)

        # Refresh edges materialized view
        refresh_edges_materialized_view.delay()

        return Response(serializer.data, status=status.HTTP_201_CREATED)


@extend_schema_view(
    get=extend_schema(
        operation_id="entities_retrieve",
        summary="Get entity details",
        description="Returns details of a specific entity. Regular users can only access entities they have permissions for. Admin users can access any entity.",  # noqa: E501
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
            200: {"description": "Entity successfully deleted"},
            **get_error_responses(
                EntriesErrorCodes.ADMIN_ONLY_ENTITY_DELETE,
                EntriesErrorCodes.ENTITY_NOT_FOUND,
            ),
            **get_common_error_responses(),
        },
    ),
    post=extend_schema(
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
            **get_validation_error_response(),
            **get_error_responses(
                EntriesErrorCodes.ENTITY_NOT_FOUND,
                EntriesErrorCodes.ADMIN_ONLY_ENTITY_PUBLIC_STATUS,
            ),
            **get_common_error_responses(),
        },
    ),
)
class EntityDetail(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, HasEntryManagerRole]

    def get(self, request: Request, entity_id: int) -> Response:
        if not (
            request.user.is_cradle_admin
            or Access.objects.get_accessible_entity_ids(request.user).filter(pk=entity_id).exists()
        ):
            raise EntityNotFoundException(detail="There is no entity with specified ID.")

        try:
            entity = Entry.entities.get(pk=entity_id)
        except Entry.DoesNotExist:
            raise EntityNotFoundException(detail="There is no entity with specified ID.")

        serializer = EntitySerializer(entity)
        return Response(serializer.data)

    def delete(self, request: Request, entity_id: int) -> Response:
        if not request.user.is_cradle_admin:
            raise AdminOnlyEntityDeleteException(detail="Only admins can delete entities!")
        try:
            entity = Entry.entities.get(pk=entity_id)
        except Entry.DoesNotExist:
            raise EntityNotFoundException(detail="There is no entity with specified ID.")

        entity.delete_renaming(request.user.id)
        refresh_edges_materialized_view.apply_async()

        return Response(status=status.HTTP_204_NO_CONTENT)

    def post(self, request: Request, entity_id: int) -> Response:
        try:
            entity = Entry.entities.get(pk=entity_id)
        except Entry.DoesNotExist:
            raise EntityNotFoundException(detail="There is no entity with specified ID or you don't have access.")

        if not (Access.objects.has_access_to_entities(request.user, [entity], {AccessType.READ_WRITE})):
            raise EntityNotFoundException(detail="There is no entity with specified ID or you don't have access.")

        serializer = EntitySerializer(entity, data=request.data)
        serializer.is_valid(raise_exception=True)

        # Non-Admin cannot change public status of entity
        if (
            serializer.validated_data.get("is_public", entity.is_public) != entity.is_public
            and not request.user.is_cradle_admin
        ):
            raise AdminOnlyEntityPublicStatusException(detail="Only admins can change the public status of entities!")

        serializer.save()
        serializer.instance.log_edit(request.user)

        refresh_edges_materialized_view.apply_async()

        return Response(serializer.data)
