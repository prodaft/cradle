from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.request import Request

from ..serializers import EntitySerializer, EntryClassSerializer, ArtifactClassSerializer
from ..models import Entry, EntryClass
from logs.utils import LoggingUtils
from logs.decorators import log_failed_responses

from uuid import UUID

class EntryClassList(APIView):

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    # TODO: Perhaps POST here should have different permissions

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

        entities = EntryClass.objects.all()
        serializer = EntryClassSerializer(entities, many=True)

        return Response(serializer.data)

    @log_failed_responses
    def post(self, request: Request) -> Response:
        """Allow an admin to create a new EntryClass of type Artifact by specifying its subtype
           and format.

        Args:
            request: The request that was sent

        Returns:
            Response(status=200): A JSON response containing the created entryclass
                if the request was successful
            Response("User is not authenticated.", status=401):
                if the user is not authenticated
            Response("User is not an admin.", status=403):
                if the authenticated user is not an admin
            Response("Bad request", status=400):
                if the provided data is not a valid entity
            Response("EntryClass with the same name already exists", status=409):
                if an entity with the same name already exists
        """
        serializer = ArtifactClassSerializer(data=request.data)

        if serializer.is_valid(raise_exception=True):
            serializer.save()
            LoggingUtils.log_entryclass_creation(request)
            return Response(serializer.data)

        return Response("The data is not valid", status=status.HTTP_400_BAD_REQUEST)

class EntryClassDetail(APIView):

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsAdminUser]

    @log_failed_responses
    def get(self, request: Request, class_subtype: str) -> Response:
        """Allow an admin to retrieve the details of a specific entity

        Args:
            request: The request that was sent
            class_subtype: The subtype of the class being edited

        Returns:
        Response(status=200): A JSON response containing the details of the subtype
        Response("User is not authenticated.", status=401):
            if the user is not authenticated
        Response("User is not an admin.", status=403):
            if the authenticated user is not an admin
        """

        entities = EntryClass.objects.get(subtype=class_subtype)
        serializer = EntryClassSerializer(entities)

        return Response(serializer.data)

    @log_failed_responses
    def delete(self, request: Request, class_subtype: str) -> Response:
        """Allow an admin to delete an Artifact class by specifying its subtype

        Args:
            request: The request that was sent
            class_subtype: The subtype of the class being edited

        Returns:
            Response(status=200): A JSON response containing the deleted
                entry class if the request was successful
            Response("User is not authenticated.", status=401):
                if the user is not authenticated
            Response("User is not an admin.", status=403):
                if the authenticated user is not an admin
            Response("There is no entity with specified ID", status=404):
                if there is no entity with the provided id
        """

        try:
            entity = EntryClass.objects.get(subtype=class_subtype)
        except EntryClass.DoesNotExist:
            return Response(
                "There is no entry class with specified subtype", status=status.HTTP_404_NOT_FOUND
            )
        entity.delete()

        LoggingUtils.log_entryclass_deletion(request)
        return Response("Requested entry class was deleted", status=status.HTTP_200_OK)


    @log_failed_responses
    def post(self, request: Request, class_subtype: str) -> Response:
        """Allow an admin to change an EntryClass' details
        Args:
            request: The request that was sent
            class_subtype: The subtype of the class being edited

        Returns:
            Response(status=200): A JSON response containing the updated entryclass
                if the request was successful
            Response("User is not authenticated.", status=401):
                if the user is not authenticated
            Response("User is not an admin.", status=403):
                if the authenticated user is not an admin
            Response("Bad request", status=400):
                if the provided data is not a valid entity
            Response("EntryClass with the same name already exists", status=409):
                if an entity with the same name already exists
        """
        try:
            entity = EntryClass.objects.get(subtype=class_subtype)
        except EntryClass.DoesNotExist:
            return Response(
                "There is no entry class with specified subtype", status=status.HTTP_404_NOT_FOUND
            )

        serializer = ArtifactClassSerializer(entity, data=request.data)

        if serializer.is_valid():
            serializer.save()
            LoggingUtils.log_entryclass_creation(request)
            return Response(serializer.data)

        return Response("Bad request", status=status.HTTP_400_BAD_REQUEST)
