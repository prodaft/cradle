from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.permissions import IsAuthenticated
from ..serializers import NoteCreateSerializer, NoteRetrieveSerializer
from django.http import HttpRequest


class NoteList(APIView):

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request: HttpRequest) -> Response:
        """Allow a user to create a new note, by sending the text itself.
        This text should be validated to meet the requirements
        (i.e. reference at least two Entities, one of which must be a Case).

        Args:
            request: The request that was sent

        Returns:
            Response(status=200): The newly created Note entity
                if the request was successful.
            Response("Note does not reference at least one Case and two Entities.",
                status=400): if the note does not reference the minimum required
                entities and cases
            Response("User is not authenticated.", status=401):
                if the user is not authenticated
            Response("User does not have Read-Write access
                to a referenced Case or not all Cases exist.", status=404)
        """

        serializer = NoteCreateSerializer(
            data=request.data, context={"request": request}
        )
        if serializer.is_valid():
            note = serializer.save()

            json_note = NoteRetrieveSerializer(note, many=False).data
            return Response(json_note, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
