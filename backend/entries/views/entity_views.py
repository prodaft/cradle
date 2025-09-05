from uuid import UUID

from access.enums import AccessType
from access.models import Access
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication
from user.permissions import HasEntryManagerRole

from entries.tasks import refresh_edges_materialized_view

from ..models import Entry
from ..serializers import EntitySerializer, EntryResponseSerializer


@extend_schema_view(
    get=extend_schema(
        operation_id="entities_list",
        summary="List entities",
        description="Returns a list of entities. For regular users, returns only entities they have access to. For admin users, returns all entities.",  # noqa: E501
        responses={200: EntryResponseSerializer(many=True)},
    ),
    post=extend_schema(
        operation_id="entities_create",
        summary="Create entity",
        description="Creates a new entity. Only available to admin users.",
        request=EntitySerializer,
        responses={
            200: EntitySerializer,
            400: {"description": "Invalid data provided"},
            403: {"description": "User is not an admin"},
            409: {"description": "Entity already exists"},
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
            entities = Entry.objects.filter(
                id__in=Access.objects.get_accessible_entity_ids(request.user)
            )

        serializer = EntryResponseSerializer(entities, many=True)
        return Response(serializer.data)

    def post(self, request: Request) -> Response:
        """Creates a new entity. Only available to admin users."""
        serializer = EntitySerializer(data=request.data)
        if serializer.is_valid():
            # Check if entity already exists
            name = serializer.validated_data.get("name")
            if Entry.entities.filter(name=name).exists():
                return Response(
                    {"error": f"Entity with name '{name}' already exists"},
                    status=status.HTTP_409_CONFLICT,
                )  # Create new entity
            serializer.save()

            # Refresh edges materialized view
            refresh_edges_materialized_view.delay()

            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema_view(
    get=extend_schema(
        operation_id="entities_retrieve",
        summary="Get entity details",
        description="Returns details of a specific entity. Regular users can only access entities they have permissions for. Admin users can access any entity.",  # noqa: E501
        parameters=[
            OpenApiParameter(
                name="entity_id",
                type=UUID,
                location=OpenApiParameter.PATH,
                description="UUID of the entity",
            )
        ],
        responses={
            200: EntitySerializer,
            404: {"description": "Entity not found or user doesn't have access"},
        },
    ),
    delete=extend_schema(
        operation_id="entities_destroy",
        summary="Delete entity",
        description="Deletes an entity. Only available to admin users.",
        parameters=[
            OpenApiParameter(
                name="entity_id",
                type=UUID,
                location=OpenApiParameter.PATH,
                description="UUID of the entity to delete",
            )
        ],
        responses={
            200: {"description": "Entity successfully deleted"},
            403: {"description": "User is not an admin"},
            404: {"description": "Entity not found"},
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
                type=UUID,
                location=OpenApiParameter.PATH,
                description="UUID of the entity to update",
            )
        ],
        responses={
            404: {"description": "Entity not found or user doesn't have access"}
        },
    ),
)
class EntityDetail(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, HasEntryManagerRole]

    def get(self, request: Request, entity_id: int) -> Response:
        if not (
            request.user.is_cradle_admin
            or Access.objects.get_accessible_entity_ids(request.user)
            .filter(pk=entity_id)
            .exists()
        ):
            return Response(
                "There is no entity with specified ID.",
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            entity = Entry.entities.get(pk=entity_id)
        except Entry.DoesNotExist:
            return Response(
                "There is no entity with specified ID.",
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = EntitySerializer(entity)
        return Response(serializer.data)

    def delete(self, request: Request, entity_id: UUID) -> Response:
        if not request.user.is_cradle_admin:
            return Response(
                "Only admins can delete entities!", status=status.HTTP_403_FORBIDDEN
            )
        try:
            entity = Entry.entities.get(pk=entity_id)
        except Entry.DoesNotExist:
            return Response(
                "There is no entity with specified ID.",
                status=status.HTTP_404_NOT_FOUND,
            )

        entity.delete_renaming(request.user.id)
        refresh_edges_materialized_view.apply_async(simulate=True)

        return Response("Requested entity was deleted", status=status.HTTP_200_OK)

    def post(self, request: Request, entity_id: UUID) -> Response:
        try:
            entity = Entry.entities.get(pk=entity_id)
        except Entry.DoesNotExist:
            return Response(
                "There is no entity with specified ID or you don't have access.",
                status=status.HTTP_404_NOT_FOUND,
            )

        if not (
            Access.objects.has_access_to_entities(
                request.user, [entity], {AccessType.READ_WRITE}
            )
        ):
            return Response(
                "There is no entity with specified ID or you don't have access.",
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = EntitySerializer(entity, data=request.data)

        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # Non-Admin cannot change public status of entity
        if (
            serializer.validated_data.get("is_public", entity.is_public)
            != entity.is_public
            and not request.user.is_cradle_admin
        ):
            return Response(
                "Only admins can change the public status of entities!",
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer.save()
        serializer.instance.log_edit(request.user)

        refresh_edges_materialized_view.apply_async()

        return Response(serializer.data)
