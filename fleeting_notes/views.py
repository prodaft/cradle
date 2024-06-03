from typing import cast

from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.response import Response
from rest_framework.request import Request
from rest_framework import status

from fleeting_notes.models import FleetingNote
from fleeting_notes.serializers import (
    FleetingNoteCreateSerializer,
    FleetingNoteTruncatedRetrieveSerializer,
)
from user.models import CradleUser


class FleetingNotesList(APIView):

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        """
        Get all the FleetingNotes that belong to the authenticated user.
        FleetingNotes are ordered by last_edited in descending order.
        FleetingNotes are truncated to 200 characters for preview.

        Args:
            request: The request that was sent

        Returns:
            Response(serializer.data, status=200):
                The FleetingNotes that belong to the authenticated user
            Response("User is not authenticated.", status=401):
                if the user is not authenticated
        """
        fleeting_notes = FleetingNote.objects.filter(
            user=cast(CradleUser, request.user)
        ).order_by("-last_edited")
        serializer = FleetingNoteTruncatedRetrieveSerializer(fleeting_notes, many=True)
        return Response(serializer.data)

    def post(self, request: Request) -> Response:
        """
        Create a new FleetingNote entity based on the request data.
        The user field is set to correspond to the authenticated user.

        Args:
            request: The request that was sent

        Returns:
            Response(serializer.data, status=200):
                The created FleetingNote entity
            Response(serializer.errors, status=400):
                if the request was unsuccessful
            Response("User is not authenticated.", status=401):
                if the user is not authenticated
        """
        serializer = FleetingNoteCreateSerializer(
            data=request.data, context={"request": request}
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
