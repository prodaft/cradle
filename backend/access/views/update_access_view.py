"""View for updating a user's access level on an entity."""

from typing import cast
from uuid import UUID

from django.db import transaction
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from core.exceptions import CoreErrorCodes
from core.openapi import get_common_error_responses, get_error_responses
from entries.exceptions import EntityNotFoundException, EntriesErrorCodes
from entries.models import Entry
from notifications.models import AccessGrantedNotification
from teams.rules import can_set_user_access
from user.authentication import CookieJWTAuthentication
from user.exceptions import UserErrorCodes, UserNotFoundException
from user.models import CradleUser

from ..enums import AccessType
from ..exceptions import AccessChangeNotAllowedException, AccessErrorCodes
from ..models import Access
from ..serializers import AccessSerializer


@extend_schema_view(
    put=extend_schema(
        operation_id="entities_access_users_update",
        summary="Update user access for entity",
        description=(
            "Updates a user's direct access to an entity. Admins can update any non-admin user. For an entity "
            "with an owning team, that team's leads can, up to their own access to the entity; for an entity "
            "without one, any manager can."
        ),
        request=AccessSerializer,
        responses={
            200: AccessSerializer,
            **get_error_responses(
                UserErrorCodes.USER_NOT_FOUND,
                EntriesErrorCodes.ENTITY_NOT_FOUND,
                AccessErrorCodes.ACCESS_CHANGE_NOT_ALLOWED,
                CoreErrorCodes.INVALID_REQUEST,
                include_validation_error=True,
            ),
            **get_common_error_responses(),
        },
    )
)
class UpdateAccess(APIView):
    """Update a user's direct access level for an entity (see ``teams.rules``)."""

    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAuthenticated]
    serializer_class = AccessSerializer

    def put(self, request: Request, user_id: UUID, entity_id: int) -> Response:
        """Update a user's access for an entity. See schema for permission rules."""
        try:
            updated_user = CradleUser.objects.get(id=user_id)
        except CradleUser.DoesNotExist:
            raise UserNotFoundException(detail="That user could not be found.")

        try:
            updated_entity = Entry.entities.get(id=entity_id)
        except Entry.DoesNotExist:
            raise EntityNotFoundException(detail="That entity could not be found.")

        serializer = AccessSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user: CradleUser = cast(CradleUser, request.user)
        if not can_set_user_access(user, updated_user, updated_entity, serializer.validated_data["access_type"]):
            raise AccessChangeNotAllowedException(
                detail="You do not have permission to change this user's access for this entity."
            )

        access_type = serializer.validated_data["access_type"]
        with transaction.atomic():
            Access.objects.update_or_create(
                user=updated_user, entity=updated_entity, defaults={"access_type": access_type}
            )
            access_label = str(AccessType(access_type).label)
            AccessGrantedNotification.objects.create(
                user=updated_user,
                entity=updated_entity,
                message=f'Your access to "{updated_entity.name}" was changed to {access_label}.',
            )

        return Response({"access_type": access_type}, status=status.HTTP_200_OK)
