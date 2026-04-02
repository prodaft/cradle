"""Views for creating and retrieving entries (artifacts and entities)."""

from django.db import transaction
from django.urls import reverse
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from access.models import Access
from core.exceptions import CoreErrorCodes, PermissionDeniedException
from core.openapi import get_common_error_responses, get_error_responses

from ..enums import EntryType
from ..exceptions import (
    AdminOnlyEntityCreateException,
    DuplicateEntryException,
    EntriesErrorCodes,
    EntryNotFoundException,
    InvalidEntryTypeException,
)
from ..models import Entry
from ..serializers import ArtifactSerializer, EntitySerializer, EntrySerializer


@extend_schema_view(
    post=extend_schema(
        operation_id="entries_entries_create",
        summary="Create a new entry",
        description="Creates a new entry (artifact or entity). Only administrators can create entities.",
        request=EntrySerializer,
        responses={
            201: EntrySerializer,
            **get_error_responses(
                EntriesErrorCodes.INVALID_ENTRY_TYPE,
                EntriesErrorCodes.ADMIN_ONLY_ENTITY_CREATE,
                EntriesErrorCodes.DUPLICATE_ENTRY,
                include_validation_error=True,
            ),
            **get_common_error_responses(),
        },
    ),
)
class EntryView(generics.CreateAPIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    serializer_class = EntrySerializer

    def create(self, request: Request) -> Response:
        """Create artifact or entity based on type; entities require admin."""
        entry_type_raw = request.data.get("type")
        if not entry_type_raw:
            raise InvalidEntryTypeException(detail="Choose whether this entry is an Artifact or an Entity.")
        entry_type = str(entry_type_raw).lower()

        if entry_type == EntryType.ARTIFACT.value:
            serializer_class = ArtifactSerializer

        elif entry_type == EntryType.ENTITY.value:
            if not request.user.is_cradle_admin:
                raise AdminOnlyEntityCreateException(detail="Only administrators can create entities.")
            serializer_class = EntitySerializer
        else:
            raise InvalidEntryTypeException(detail="That value is not recognized. Choose Artifact or Entity.")

        serializer = serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            if hasattr(serializer, "exists") and serializer.exists():
                raise DuplicateEntryException(detail="An entry with this name already exists.")
            serializer.save()
            serializer.instance.log_create(request.user)
        location = request.build_absolute_uri(reverse("entry_detail", kwargs={"entry_id": serializer.instance.id}))
        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED,
            headers={"Location": location},
        )


class EntryDetailView(APIView):
    """Retrieve a single entry by ID with access control."""

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    @extend_schema(
        operation_id="entries_entries_retrieve",
        summary="Retrieve entry details",
        description="Returns detailed information about a specific entry by ID. Access control applies for entities.",
        parameters=[
            OpenApiParameter(
                name="entry_id",
                type=int,
                location=OpenApiParameter.PATH,
                description="ID of the entry",
            )
        ],
        responses={
            200: EntrySerializer,
            **get_error_responses(
                EntriesErrorCodes.ENTRY_NOT_FOUND,
                CoreErrorCodes.PERMISSION_DENIED,
            ),
            **get_common_error_responses(),
        },
    )
    def get(self, request: Request, entry_id: int) -> Response:
        """Return entry details; entity access requires permission."""
        try:
            entry = Entry.objects.accessible(request.user).select_related("entry_class").get(pk=entry_id)
        except Entry.DoesNotExist:
            raise EntryNotFoundException(detail="That entry could not be found.")

        # Access control for entities
        if entry.entry_class.type == EntryType.ENTITY:
            if not (request.user.is_cradle_admin or Access.objects.user_has_entity_access(request.user.id, entry_id)):
                raise PermissionDeniedException(detail="You do not have access to this entity.")

        serializer = EntrySerializer(entry)

        return Response(serializer.data, status=status.HTTP_200_OK)
