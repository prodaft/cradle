from uuid import UUID

from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from access.models import Access
from core.pagination import TotalPagesPagination
from core.openapi import (
    get_error_responses,
    get_validation_error_response,
    get_common_error_responses,
)
from drf_spectacular.utils import extend_schema, extend_schema_view
from ..exceptions import (
    DuplicateEntryException,
    InvalidEntryTypeException,
    AdminOnlyEntityCreateException,
    EntryNotFoundException,
    EntriesErrorCodes,
)

from ..models import Entry
from ..serializers import ArtifactSerializer, EntitySerializer, EntrySerializer
from ..enums import EntryType


@extend_schema_view(
    post=extend_schema(
        summary="Create a new entry",
        description="Creates a new entry (artifact or entity). Only admins can create entities.",
        request=EntrySerializer,
        responses={
            200: EntrySerializer,
            **get_validation_error_response(),
            **get_error_responses(
                EntriesErrorCodes.INVALID_ENTRY_TYPE,
                EntriesErrorCodes.ADMIN_ONLY_ENTITY_CREATE,
                EntriesErrorCodes.DUPLICATE_ENTRY,
            ),
            **get_common_error_responses(),
        },
    ),
)
class EntryView(generics.CreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = EntrySerializer
    pagination_class = TotalPagesPagination

    def get_queryset(self):
        return Entry.objects.accessible(self.request.user).all()

    def create(self, request: Request) -> Response:
        entry_type = request.data.get("type")

        if entry_type == EntryType.ARTIFACT:
            serializer_class = ArtifactSerializer

        elif entry_type == EntryType.ENTITY:
            if not request.user.is_cradle_admin:
                raise AdminOnlyEntityCreateException(detail="Only admins can create entities!")
            serializer_class = EntitySerializer
        else:
            raise InvalidEntryTypeException(detail="Invalid entry type. Must be 'artifact' or 'entity'.")

        data = request.data.copy()

        if not isinstance(request.data, dict):
            data = request.data.dict()

        serializer = serializer_class(data=data)
        serializer.is_valid(raise_exception=True)

        if hasattr(serializer, "exists") and serializer.exists():
            raise DuplicateEntryException()

        serializer.save()
        serializer.instance.log_create(request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


@extend_schema(
    summary="Retrieve entry details",
    description="Returns detailed information about a specific entry by ID. Access control applies for entities.",
    responses={
        200: EntrySerializer,
        **get_error_responses(
            EntriesErrorCodes.ENTRY_NOT_FOUND,
        ),
        **get_common_error_responses(),
    },
)
class EntryDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request, id: UUID) -> Response:
        try:
            entry = Entry.objects.accessible(request.user).get(pk=id)
        except Entry.DoesNotExist:
            raise EntryNotFoundException(detail="There is no entry with specified ID.")

        # Access control for entities
        if entry.type == EntryType.ENTITY:
            if not (
                request.user.is_cradle_admin
                or Access.objects.get_accessible_entity_ids(request.user).filter(pk=id).exists()
            ):
                raise EntryNotFoundException(detail="There is no entity with specified ID.")

        serializer = EntrySerializer(entry)

        return Response(serializer.data)
