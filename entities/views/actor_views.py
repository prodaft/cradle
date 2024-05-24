from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.request import Request

from ..serializers.entity_serializers import ActorResponseSerializer, ActorSerializer
from ..models import Entity


class ActorList(APIView):

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request: Request) -> Response:
        """Allow an admin to retrieve the details of all Actors

        Args:
            request: The request that was sent

        Returns:
            Response(status=200): A JSON response contained the list of all actors
                if the request was successful.
            Response("User is not authenticated.", status=401):
                if the user is not authenticated
            Response("User is not an admin.", status=403):
                if the authenticated user is not an admin
        """

        actors = Entity.actors.all()
        serializer = ActorResponseSerializer(actors, many=True)

        return Response(serializer.data)

    def post(self, request: Request) -> Response:
        """Allow an admin to create a new Actor by specifying its name

        Args:
            request: The request that was sent

        Returns:
            Response(status=200): A JSON response containing the created actor
                if the request was successful
            Response("User is not authenticated.", status=401):
                if the user is not authenticated
            Response("User is not an admin.", status=403):
                if the authenticated user is not an admin
            Response("Bad request", status=400):
                if the provided data is not a valid actor
            Response("Actor with the same name already exists", status=409):
                if an actor with the same name already exists
        """

        serializer = ActorSerializer(data=request.data)

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)

        return Response("Bad request", status=status.HTTP_400_BAD_REQUEST)


class ActorDetail(APIView):

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsAdminUser]

    def delete(self, request: Request, actor_id: int) -> Response:
        """Allow an admin to delete an Actor by specifying its id

        Args:
            request: The request that was sent
            actor_id: The id of the actor that will be deleted

        Returns:
            Response(status=200): A JSON response containing the created actor
                if the request was successful
            Response("User is not authenticated.", status=401):
                if the user is not authenticated
            Response("User is not an admin.", status=403):
                if the authenticated user is not an admin
            Response("There is no actor with specified ID", status=404):
                if there is no actor with the provided id
        """

        try:
            actor = Entity.actors.get(pk=actor_id)
        except Entity.DoesNotExist:
            return Response(
                "There is no actor with specified ID", status=status.HTTP_404_NOT_FOUND
            )

        actor.delete()
        return Response("Requested actor was deleted", status=status.HTTP_200_OK)
