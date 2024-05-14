from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.permissions import IsAuthenticated, IsAdminUser

from ..serializers import ActorSerializer
from ..models import Actor


class ActorList(APIView):

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request, format=None):
        """Allow an admin to retrieve the details of all Actors

        Args:
            request: The request that was sent

        Returns:
        JsonResponse: A JSON response contained the list of all actors
            if the request was successful.
        HttpResponse("User is not authenticated.", status=401):
            if the user is not authenticated
        HttpResponse("User is not an admin.", status=403):
            if the authenticated user is not an admin
        """

        actors = Actor.objects.all()
        serializer = ActorSerializer(actors, many=True)

        return Response(serializer.data)

    def post(self, request, format=None):
        """Allow an admin to create a new Actor by specifying its name

        Args:
            request: The request that was sent

        Returns:
            JsonResponse: A JSON response containing the created actor
                if the request was successful
            HttpResponse("User is not authenticated.", status=401):
                if the user is not authenticated
            HttpResponse("User is not an admin.", status=403):
                if the authenticated user is not an admin
            return HttpResponse("Bad request", status=404):
                if the provided data is not a valid actor
        """

        serializer = ActorSerializer(data=request.data)

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)

        return Response("Bad request", status=status.HTTP_404_NOT_FOUND)


class ActorDetail(APIView):

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsAdminUser]

    def delete(self, request, actor_id, format=None):
        """Allow an admin to delete an Actor by specifying its id

        Args:
            request: The request that was sent
            actor_id: The id of the actor that will be deleted

        Returns:
            JsonResponse: A JSON response containing the created actor
                if the request was successful
            HttpResponse("User is not authenticated.", status=401):
                if the user is not authenticated
            HttpResponse("User is not an admin.", status=403):
                if the authenticated user is not an admin
            HttpResponse("There is no actor with specified ID", status=404):
                if there is no actor with the provided id
        """

        actor = None
        try:
            actor = Actor.objects.get(pk=actor_id)
        except Actor.DoesNotExist:
            return Response(
                "There is no actor with specified ID", status=status.HTTP_404_NOT_FOUND
            )

        actor.delete()
        return Response("Requested actor was deleted", status=status.HTTP_200_OK)
