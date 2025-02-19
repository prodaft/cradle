from django.conf import settings
from rest_framework.response import Response
from rest_framework.request import Request
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.permissions import IsAuthenticated

from access.enums import AccessType
from entries.enums import EntryType
from publish.strategies.catalyst import CatalystPublish
from notes.models import Note

from user.models import CradleUser
from access.models import Access

from typing import cast


from drf_spectacular.utils import extend_schema


class ErrorResponse(Response):
    def __init__(msg, *args, **kwargs):
        super().__init__({"detail": msg}, *args, **kwargs)


class PublishView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Publish Notes",
        description="Allow a user to publish a set of notes using a specified strategy.",
        request={
            "type": "object",
            "properties": {
                "note_ids": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "List of note IDs to publish.",
                },
                "strategy_name": {
                    "type": "string",
                    "description": "Name of the strategy to use for publishing.",
                },
            },
            "required": ["note_ids", "strategy_name"],
        },
        responses={
            200: {"type": "object", "properties": {"status": {"type": "string"}}},
            400: "Bad Request",
            401: "Unauthorized",
        },
    )
    def post(self, request: Request, strategy_name: str) -> Response:
        note_ids = request.data.get("note_ids", [])
        user = cast(CradleUser, request.user)

        if "title" not in request.data:
            return ErrorResponse("Missing title", status=404)

        title = request.data["title"]

        if len(note_ids) == 0:
            return ErrorResponse("No notes provided", status=500)

        if strategy_name == "catalyst":
            strategy = CatalystPublish(
                "TLP:RED",
                settings.CATALYST_PUBLISH_CATEGORY,
                settings.CATALYST_PUBLISH_SUBCATEGORY,
            )
        else:  # strategy does not exist
            return ErrorResponse("Strategy not found", status=404)

        notes = Note.objects.filter(id__in=note_ids)

        found_note_ids = set(map(lambda x: str(x.pk), notes))

        missing_note_ids = set(note_ids).difference(found_note_ids)

        if len(missing_note_ids) > 0:
            return ErrorResponse(
                f"Note not found {str(missing_note_ids.pop()).pk}", status=404
            )

        for note in notes:
            if not Access.objects.has_access_to_entities(
                user,
                set(note.entries.filter(entry_class__type=EntryType.ENTITY)),
                {AccessType.READ, AccessType.READ_WRITE},
            ):
                return ErrorResponse(f"Note not found {str(note.pk)}", status=404)
            if not note.publishable:
                return ErrorResponse(
                    f"Note {str(note.pk)}is not publishable", status=403
                )

        msg = strategy.publish(title, notes, user)

        if msg is None:
            return Response("Note created succesfully", status=200)

        return ErrorResponse({"detail": msg}, status=500)
