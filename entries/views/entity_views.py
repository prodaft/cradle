from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.request import Request
from drf_spectacular.utils import extend_schema, extend_schema_view

from ..serializers import EntitySerializer, EntryResponseSerializer
from ..models import Entry
from logs.utils import LoggingUtils
from uuid import UUID


@extend_schema_view(
    get=extend_schema(
        description="Allows an admin to retrieve details of all Entities in the system.",
        responses={
            200: EntryResponseSerializer(many=True),
            401: "User is not authenticated.",
            403: "User is not an admin.",
        },
        summary="Retrieve All Entities",
    ),
    post=extend_schema(
        description="Allows an admin to create a new Entity by providing its name and type.",
        request=EntitySerializer,
        responses={
            200: EntitySerializer,
            400: "Bad request: Invalid data for creating an entity.",
            401: "User is not authenticated.",
            403: "User is not an admin.",
            409: "Entity with the same name already exists.",
        },
        summary="Create New Entity",
    ),
)
class EntityList(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request: Request) -> Response:
        entities = Entry.entities.all()
        serializer = EntryResponseSerializer(entities, many=True)
        return Response(serializer.data)

    def post(self, request: Request) -> Response:
        serializer = EntitySerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            LoggingUtils.log_entry_creation(request)
            return Response(serializer.data)
        return Response("Bad request", status=status.HTTP_400_BAD_REQUEST)


@extend_schema_view(
    get=extend_schema(
        description="Retrieve details of a specific Entity by its ID. Admin access required.",
        responses={
            200: EntitySerializer,
            401: "User is not authenticated.",
            403: "User is not an admin.",
            404: "Entity not found with specified ID.",
        },
        summary="Retrieve Entity Details",
    ),
    delete=extend_schema(
        description="Delete a specific Entity by its ID. Admin access required.",
        responses={
            200: "Entity deleted successfully.",
            401: "User is not authenticated.",
            403: "User is not an admin.",
            404: "Entity not found with specified ID.",
        },
        summary="Delete Entity",
    ),
    post=extend_schema(
        description="Edit an existing Entity by providing its ID and updated data. Admin access required.",
        request=EntitySerializer,
        responses={
            200: EntitySerializer,
            400: "Bad request: Invalid data for updating entity.",
            401: "User is not authenticated.",
            403: "User is not an admin.",
            404: "Entity not found with specified ID.",
            409: "Entity with the same name already exists.",
        },
        summary="Edit Entity",
    ),
)
class EntityDetail(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request: Request, entity_id: UUID) -> Response:
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
        try:
            entity = Entry.entities.get(pk=entity_id)
        except Entry.DoesNotExist:
            return Response(
                "There is no entity with specified ID.",
                status=status.HTTP_404_NOT_FOUND,
            )
        entity.delete()
        LoggingUtils.log_entry_deletion(request)
        return Response("Requested entity was deleted", status=status.HTTP_200_OK)

    def post(self, request: Request, entity_id: UUID) -> Response:
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
            LoggingUtils.log_entry_creation(request)
            return Response(serializer.data)
        return Response("Bad request", status=status.HTTP_400_BAD_REQUEST)
