from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.response import Response
from rest_framework.request import Request

from fleeting_notes.models import FleetingNote
from fleeting_notes.serializers import (
    FleetingNoteRetrieveSerializer,
    FleetingNoteCreateSerializer,
)


class FleetingNotesList(APIView):

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        fleeting_notes = FleetingNote.objects.filter(user=request.user)
        serializer = FleetingNoteRetrieveSerializer(fleeting_notes, many=True)
        return Response(serializer.data)

    def post(self, request: Request) -> Response:
        serializer = FleetingNoteCreateSerializer(
            data=request.data, context={"request": request}
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=200)
        return Response(serializer.errors, status=400)
