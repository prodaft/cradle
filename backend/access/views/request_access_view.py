"""View for requesting access to an entity."""

from typing import cast

from django.db.models import QuerySet
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from core.openapi import get_common_error_responses, get_error_responses
from entries.exceptions import EntityNotFoundException, EntriesErrorCodes
from entries.models import Entry
from notifications.models import AccessRequestNotification
from user.authentication import CookieJWTAuthentication
from user.models import CradleUser

from ..enums import AccessType
from ..serializers import RequestAccessSerializer, RequestEntitiesAccessSerializer


@extend_schema_view(
    post=extend_schema(
        operation_id="entities_access_requests_create",
        summary="Request access to entity",
        description="Allows a user to request access for an entity. The leads of the entity's owning team are notified (admins if it has none); for an entity without an owning team, all admins and managers are. If the user making the request already has read-write access, no notifications are sent but the request is deemed successful.",  # noqa: E501
        parameters=[
            OpenApiParameter(
                name="subtype",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Optional subtype/entry class ID to filter entity by",
                required=False,
            ),
        ],
        responses={
            201: {"description": "Access request sent successfully"},
            **get_error_responses(
                EntriesErrorCodes.ENTITY_NOT_FOUND,
                include_validation_error=True,
            ),
            **get_common_error_responses(),
        },
    )
)
class RequestAccess(APIView):
    """Request access to an entity; notifies users with read-write access."""

    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAuthenticated]
    serializer_class = RequestAccessSerializer

    def post(self, request: Request, entity_id: int) -> Response:
        """Request access to an entity; notifies users with read-write access. See schema."""
        serializer = self.serializer_class(
            data={"entity_id": entity_id, "subtype": request.query_params.get("subtype")}
        )
        serializer.is_valid(raise_exception=True)

        user: CradleUser = cast(CradleUser, request.user)
        subtype = serializer.validated_data.get("subtype")

        try:
            if subtype:
                entity = Entry.entities.get(id=entity_id, entry_class_id=subtype)
            else:
                entity = Entry.entities.get(id=entity_id)
        except Entry.DoesNotExist:
            raise EntityNotFoundException(detail="That entity could not be found.")

        _request_read_write(user, Entry.entities.filter(id=entity.id))
        return Response({"detail": "Access request sent successfully."}, status=status.HTTP_201_CREATED)


def _request_read_write(user: CradleUser, entities: QuerySet[Entry]) -> None:
    """Ask for read-write access to ``entities``, as the single and bulk entity requests do."""
    AccessRequestNotification.request_access(
        user,
        entities,
        {AccessType.READ_WRITE},
        lambda entity: f"User {user.username} has requested access for entity {entity.name}",
    )


@extend_schema_view(
    post=extend_schema(
        operation_id="entities_access_requests_bulk_create",
        summary="Request access to several entities",
        description=(
            "Requests access to several entities at once, notifying the same users as a single request. Each of them "
            "gets one email listing the entities; entities the user already has read-write access to, or whose "
            "request the recipient has not read yet, are skipped."
        ),
        request=RequestEntitiesAccessSerializer,
        responses={
            201: {"description": "Access request sent successfully"},
            **get_error_responses(EntriesErrorCodes.ENTITY_NOT_FOUND, include_validation_error=True),
            **get_common_error_responses(),
        },
    )
)
class RequestEntitiesAccess(APIView):
    """Request access to several entities in one go."""

    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAuthenticated]
    serializer_class = RequestEntitiesAccessSerializer

    def post(self, request: Request) -> Response:
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        entity_ids = set(serializer.validated_data["entity_ids"])

        entities = Entry.entities.filter(id__in=entity_ids)
        if entities.count() != len(entity_ids):
            raise EntityNotFoundException(detail="Some of those entities could not be found.")

        _request_read_write(cast(CradleUser, request.user), entities)
        return Response({"detail": "Access request sent successfully."}, status=status.HTTP_201_CREATED)
