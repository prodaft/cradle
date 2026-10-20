"""Views for creating and retrieving entries (artifacts and entities)."""

from collections.abc import Mapping

from django.db import IntegrityError, transaction
from django.urls import reverse
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import generics, status
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from core.openapi import get_common_error_responses, get_error_responses
from user.authentication import CookieJWTAuthentication

from ..enums import EntryType
from ..exceptions import (
    DuplicateEntryException,
    EntriesErrorCodes,
    InvalidEntryTypeException,
)
from ..lookup import get_readable_entry
from ..serializers import ArtifactSerializer, EntrySerializer


@extend_schema_view(
    post=extend_schema(
        operation_id="entries_entries_create",
        summary="Create an artifact",
        description=(
            "Creates an artifact. `type` may be omitted or set to `artifact`; entities are created at "
            "`POST /entries/entities/`."
        ),
        request=ArtifactSerializer,
        responses={
            201: EntrySerializer,
            **get_error_responses(
                EntriesErrorCodes.INVALID_ENTRY_TYPE,
                EntriesErrorCodes.DUPLICATE_ENTRY,
                EntriesErrorCodes.ENTRY_TYPE_NOT_FOUND,
                EntriesErrorCodes.ENTRY_TYPE_MISMATCH,
                EntriesErrorCodes.INVALID_ENTRY,
                include_validation_error=True,
            ),
            **get_common_error_responses(),
        },
    ),
)
class EntryView(generics.CreateAPIView):
    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAuthenticated]
    serializer_class = ArtifactSerializer

    def create(self, request: Request) -> Response:
        """Create an artifact. Entities have their own endpoint, so there is one way to create each kind."""
        if not isinstance(request.data, Mapping):
            raise ValidationError({"non_field_errors": ["Send the entry as a JSON object."]})
        entry_type = str(request.data.get("type") or EntryType.ARTIFACT.value).lower()
        if entry_type == EntryType.ENTITY.value:
            raise InvalidEntryTypeException(detail="Create entities at /entries/entities/.")
        if entry_type != EntryType.ARTIFACT.value:
            raise InvalidEntryTypeException(detail="That value is not recognized. Use artifact.")

        serializer = ArtifactSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)

        try:
            with transaction.atomic():
                serializer.save()
                serializer.instance.log_create(request.user)
        except IntegrityError:
            raise DuplicateEntryException(detail="An entry with this name already exists.")
        location = request.build_absolute_uri(reverse("entry_detail", kwargs={"entry_id": serializer.instance.id}))
        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED,
            headers={"Location": location},
        )


class EntryDetailView(APIView):
    """Retrieve a single entry by ID with access control."""

    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAuthenticated]

    @extend_schema(
        operation_id="entries_entries_retrieve",
        summary="Retrieve entry details",
        description="Returns detailed information about a specific entry by ID. Access control applies for entities.",
        responses={
            200: EntrySerializer,
            **get_error_responses(EntriesErrorCodes.ENTRY_NOT_FOUND),
            **get_common_error_responses(),
        },
    )
    def get(self, request: Request, entry_id: int) -> Response:
        """Return entry details; entity access requires permission."""
        serializer = EntrySerializer(get_readable_entry(request.user, entry_id))

        return Response(serializer.data, status=status.HTTP_200_OK)
