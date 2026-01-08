from typing import Optional

from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from notes.exceptions import NoteDoesNotExistException
from notes.models import Note
from notes.serializers import (
    FleetingNoteSerializer,
    NoteEditSerializer,
    NoteRetrieveSerializer,
)
from user.models import CradleUser

from .authentication import CollabHmacAuthentication
from .permissions import IsCollabService
from .serializers import (
    CollabAccessLevel,
    CollabAuthorizeRequestSerializer,
    CollabAuthorizeResponseSerializer,
    CollabNoteApplyRequestSerializer,
)

COLLAB_HMAC_HEADERS = [
    OpenApiParameter(
        name="X-Collab-Timestamp",
        location=OpenApiParameter.HEADER,
        type=OpenApiTypes.STR,
        description="Unix timestamp (seconds) used to sign the request.",
        required=True,
    ),
    OpenApiParameter(
        name="X-Collab-Signature",
        location=OpenApiParameter.HEADER,
        type=OpenApiTypes.STR,
        description="HMAC SHA256 signature of {timestamp}.{method}.{path}.{body}.",
        required=True,
    ),
]


def get_user_from_token(token: Optional[str]) -> Optional[CradleUser]:
    if not token:
        return None
    auth = JWTAuthentication()
    try:
        validated = auth.get_validated_token(token)
        user = auth.get_user(validated)
    except Exception:
        return None
    if not user or not user.is_active:
        return None
    return user


@extend_schema_view(
    post=extend_schema(
        summary="Authorize collab access to a room",
        request=CollabAuthorizeRequestSerializer,
        responses={200: CollabAuthorizeResponseSerializer},
        parameters=COLLAB_HMAC_HEADERS,
        operation_id="collabAuthorize",
    )
)
class CollabAuthorizeView(APIView):
    authentication_classes = [CollabHmacAuthentication]
    permission_classes = [IsCollabService]

    def post(self, request):
        note_id = request.data.get("note_id")
        user_token = request.data.get("user_token")

        if not note_id:
            return Response(
                {"access": CollabAccessLevel.NONE, "user_id": None, "username": None},
                status=400,
            )

        user = get_user_from_token(user_token)
        if user is None:
            return Response(
                {"access": CollabAccessLevel.NONE, "user_id": None, "username": None},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        try:
            note = Note.objects.get(id=note_id)
        except Note.DoesNotExist:
            return Response(
                {
                    "access": CollabAccessLevel.NONE,
                    "user_id": user.id,
                    "username": user.username,
                }
            )

        if note.fleeting:
            if note.author != user:
                return Response(
                    {
                        "access": CollabAccessLevel.NONE,
                        "user_id": user.id,
                        "username": user.username,
                    }
                )
            return Response(
                {
                    "access": CollabAccessLevel.READWRITE,
                    "user_id": user.id,
                    "username": user.username,
                }
            )

        try:
            Note.objects.get_accessible_notes(user).get(id=note_id)
        except Note.DoesNotExist:
            return Response(
                {
                    "access": CollabAccessLevel.NONE,
                    "user_id": user.id,
                    "username": user.username,
                }
            )

        access = (
            CollabAccessLevel.READWRITE
            if user.is_cradle_admin or note.author == user
            else CollabAccessLevel.READ
        )
        return Response(
            {"access": access, "user_id": user.id, "username": user.username}
        )


@extend_schema_view(
    post=extend_schema(
        summary="Fetch note state for collab",
        request=None,
        responses={200: NoteRetrieveSerializer},
        parameters=COLLAB_HMAC_HEADERS,
        operation_id="collabNoteState",
    )
)
class CollabNoteStateView(APIView):
    authentication_classes = [CollabHmacAuthentication]
    permission_classes = [IsCollabService]

    def post(self, request, note_id):
        try:
            note: Note = Note.objects.all().get(id=note_id)
        except Note.DoesNotExist:
            raise NoteDoesNotExistException(detail="Note was not found.")

        return Response(NoteRetrieveSerializer(note).data, status=status.HTTP_200_OK)


@extend_schema_view(
    post=extend_schema(
        summary="Apply collab note content",
        request=CollabNoteApplyRequestSerializer,
        responses={200: NoteRetrieveSerializer},
        parameters=COLLAB_HMAC_HEADERS,
        operation_id="collabNoteApply",
    )
)
class CollabNoteApplyView(APIView):
    authentication_classes = [CollabHmacAuthentication]
    permission_classes = [IsCollabService]

    def post(self, request, note_id):
        content = request.data.get("content")
        user_id = request.data.get("user_id")
        if content is None:
            return Response(
                {"detail": "Missing content"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not user_id:
            return Response(
                {"detail": "Missing user_id"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            note: Note = Note.objects.get(id=note_id)
        except Note.DoesNotExist:
            raise NoteDoesNotExistException(detail="Note was not found.")

        actor = CradleUser.objects.filter(id=user_id, is_active=True).first()
        if actor is None:
            return Response(
                {"detail": "Invalid user_id"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        request.user = actor
        if note.fleeting:
            serializer = FleetingNoteSerializer(
                note, data={"content": content}, context={"request": request}
            )
            serializer.is_valid(raise_exception=True)
            note = serializer.save()
        else:
            serializer = NoteEditSerializer(
                note, data={"content": content}, context={"request": request}
            )
            serializer.is_valid(raise_exception=True)
            note = serializer.save()
        return Response(NoteRetrieveSerializer(note).data, status=status.HTTP_200_OK)
