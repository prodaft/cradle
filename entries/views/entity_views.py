from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.request import Request

from ..serializers import EntitySerializer, EntryResponseSerializer
from ..models import Entry
from logs.utils import LoggingUtils
from logs.decorators import log_failed_responses

from uuid import UUID


class EntityList(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsAdminUser]

    @log_failed_responses
    def get(self, request: Request) -> Response:
        """Allow an admin to retrieve the details of all Entities

        Args:
            request: The request that was sent

        Returns:
        Response(status=200): A JSON response contained the list of all entities
            if the request was successful.
        Response("User is not authenticated.", status=401):
            if the user is not authenticated
        Response("User is not an admin.", status=403):
            if the authenticated user is not an admin
        """

        entities = Entry.entities.all()
        serializer = EntryResponseSerializer(entities, many=True)

        return Response(serializer.data)

    @log_failed_responses
    def post(self, request: Request) -> Response:
        """Allow an admin to create a new Entity by specifying its name and type

        Args:
            request: The request that was sent

        Returns:
            Response(status=200): A JSON response containing the created entity
                if the request was successful
            Response("User is not authenticated.", status=401):
                if the user is not authenticated
            Response("User is not an admin.", status=403):
                if the authenticated user is not an admin
            Response("Bad request", status=400):
                if the provided data is not a valid entity
            Response("Entity with the same name already exists", status=409):
                if an entity with the same name already exists
        """

        serializer = EntitySerializer(data=request.data)

        if serializer.is_valid():
            serializer.save()
            LoggingUtils.log_entry_creation(request)
            return Response(serializer.data)

        return Response("Bad request", status=status.HTTP_400_BAD_REQUEST)


class EntityDetail(APIView):

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsAdminUser]

    @log_failed_responses
    def get(self, request: Request, entity_id: UUID) -> Response:
        """Allow an admin to retrieve details of an entity

        Args:
            request: The request that was sent
            entity_id: The id of the entity that will be deleted

        Returns:
        Response(status=200): A JSON response contained the details of the
            requested entity if the request was successful.
        Response("User is not authenticated.", status=401):
            if the user is not authenticated
        Response("User is not an admin.", status=403):
            if the authenticated user is not an admin
        """

        entity = Entry.entities.get(pk=entity_id)
        serializer = EntitySerializer(entity)

        return Response(serializer.data)

    @log_failed_responses
    def delete(self, request: Request, entity_id: UUID) -> Response:
        """Allow an admin to delete an Entity by specifying its id

        Args:
            request: The request that was sent
            entity_id: The id of the entity that will be deleted

        Returns:
            Response(status=200): A JSON response containing the created entity
                if the request was successful
            Response("User is not authenticated.", status=401):
                if the user is not authenticated
            Response("User is not an admin.", status=403):
                if the authenticated user is not an admin
            Response("There is no entity with specified ID", status=404):
                if there is no entity with the provided id
        """

        try:
            entity = Entry.entities.get(pk=entity_id)
        except Entry.DoesNotExist:
            return Response(
                "There is no entity with specified ID", status=status.HTTP_404_NOT_FOUND
            )
        entity.delete()
        LoggingUtils.log_entry_deletion(request)
        return Response("Requested entity was deleted", status=status.HTTP_200_OK)

    @log_failed_responses
    def post(self, request: Request, entity_id: UUID) -> Response:
        """Allow an admin to update an Entity by specifying its id

        Args:
            request: The request that was sent
            entity_id: The id of the entity that will be deleted

        Returns:
            Response(status=200): A JSON response containing the created entity
                if the request was successful
            Response("User is not authenticated.", status=401):
                if the user is not authenticated
            Response("User is not an admin.", status=403):
                if the authenticated user is not an admin
            Response("There is no entity with specified ID", status=404):
                if there is no entity with the provided id
        """

        try:
            entity = Entry.entities.get(pk=entity_id)
        except Entry.DoesNotExist:
            return Response(
                "There is no entity with specified ID", status=status.HTTP_404_NOT_FOUND
            )

        serializer = EntitySerializer(entity, data=request.data, partial=True)

        if serializer.is_valid():
            serializer.save()
            LoggingUtils.log_entry_update(request)
            return Response(serializer.data)

        return Response("Bad request", status=status.HTTP_400_BAD_REQUEST)
