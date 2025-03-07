from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from drf_spectacular.utils import extend_schema, extend_schema_view

from access.models import Access
from entries.exceptions import DuplicateEntryException
from user.permissions import HasEntryManagerRole

from ..serializers import EntitySerializer, EntryResponseSerializer
from ..models import Entry
from uuid import UUID


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
        if not request.user.is_cradle_admin:
            return Response(
                "Only admins can create entities!", status=status.HTTP_403_FORBIDDEN
            )

        serializer = EntitySerializer(data=dict(request.data))

        if serializer.is_valid():
            if serializer.exists():
                raise DuplicateEntryException()
            serializer.save()
            serializer.instance.log_create(request.user)

            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema_view(
    get=extend_schema(
        summary="Retrieve Entity",
        description="Get details of a specific entity by ID.",
        responses={
            200: EntitySerializer,
            401: "User is not authenticated",
            403: "User lacks required permissions",
            404: "Entity not found",
        },
    ),
    delete=extend_schema(
        summary="Delete Entity",
        description="Delete an entity. Requires admin privileges.",
        responses={
            200: "Entity deleted successfully",
            401: "User is not authenticated",
            403: "User is not an admin",
            404: "Entity not found",
        },
    ),
    post=extend_schema(
        summary="Update Entity",
        description="Update an existing entity.",
        request=EntitySerializer,
        responses={
            200: EntitySerializer,
            400: "Invalid data provided",
            401: "User is not authenticated",
            403: "User lacks required permissions",
            404: "Entity not found",
        },
    ),
)
class EntityDetail(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, HasEntryManagerRole]

    def get(self, request: Request, entity_id: UUID) -> Response:
        if not (
            request.user.is_cradle_admin
            or Access.objects.get_accessible_entity_ids(request.user)
            .filter(entity_id=entity_id)
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
        entity.delete()
        return Response("Requested entity was deleted", status=status.HTTP_200_OK)

    def post(self, request: Request, entity_id: UUID) -> Response:
        if not (
            request.user.is_cradle_admin
            or Access.objects.get_accessible_entity_ids(request.user)
            .filter(entity_id=entity_id)
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

        serializer = EntitySerializer(entity, data=request.data)
        if serializer.is_valid():
            serializer.save()
            serializer.instance.log_edit(request.user)
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
