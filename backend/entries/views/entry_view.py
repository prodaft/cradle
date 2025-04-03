from uuid import UUID
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from access.models import Access
from core.pagination import TotalPagesPagination
from ..exceptions import DuplicateEntryException

from ..models import Entry
from ..serializers import ArtifactSerializer, EntitySerializer, EntrySerializer
from ..enums import EntryType


class EntryView(generics.ListCreateAPIView):
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
                return Response(
                    "Only admins can create entries!", status=status.HTTP_403_FORBIDDEN
                )
            serializer_class = EntitySerializer
        else:
            return Response(
                "Invalid entry type. Must be 'artifact' or 'entity'.",
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = serializer_class(data=dict(request.data))

        if serializer.is_valid():
            if hasattr(serializer, "exists") and serializer.exists():
                raise DuplicateEntryException()

            serializer.save()
            serializer.instance.log_create(request.user)
            return Response(serializer.data)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class EntryDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request, id: UUID) -> Response:
        try:
            entry = Entry.objects.accessible(request.user).get(pk=id)
        except Entry.DoesNotExist:
            return Response(
                "There is no entry with specified ID.", status=status.HTTP_404_NOT_FOUND
            )

        # Access control for entities
        if entry.type == EntryType.ENTITY:
            if not (
                request.user.is_cradle_admin
                or Access.objects.get_accessible_entity_ids(request.user)
                .filter(pk=id)
                .exists()
            ):
                return Response(
                    "There is no entity with specified ID.",
                    status=status.HTTP_404_NOT_FOUND,
                )

        serializer = EntrySerializer(entry)

        return Response(serializer.data)
