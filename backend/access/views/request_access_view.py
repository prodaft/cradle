"""View for requesting access to an entity."""

from typing import cast

from django.db import transaction
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from core.openapi import get_common_error_responses, get_error_responses
from entries.exceptions import EntityNotFoundException, EntriesErrorCodes
from entries.models import Entry
from notifications.models import AccessRequestNotification
from user.models import CradleUser

from ..enums import AccessType
from ..models import Access
from ..serializers import RequestAccessSerializer


@extend_schema_view(
    post=extend_schema(
        operation_id="access_request_create",
        summary="Request access to entity",
        description="Allows a user to request access for an entity. All users with read-write access for that specific entity will receive a notification. If the user making the request already has read-write access, no notifications are sent but the request is deemed successful.",  # noqa: E501
        parameters=[
            OpenApiParameter(
                name="entity_id",
                type=int,
                location=OpenApiParameter.PATH,
                description="ID of the entity to request access for",
            ),
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

    authentication_classes = [JWTAuthentication]
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

        if (
            user.is_cradle_admin
            or Access.objects.filter(user=user, entity=entity, access_type=AccessType.READ_WRITE).exists()
        ):
            return Response({"detail": "Access request sent successfully."}, status=status.HTTP_201_CREATED)

        notified_user_ids = Access.objects.get_users_with_access(entity.id)
        with transaction.atomic():
            for notified_user_id in notified_user_ids:
                AccessRequestNotification.objects.create(
                    user_id=notified_user_id,
                    requesting_user=user,
                    entity=entity,
                    message=f"User {user.username} has requested access for entity {entity.name}",
                )

        return Response({"detail": "Access request sent successfully."}, status=status.HTTP_201_CREATED)
