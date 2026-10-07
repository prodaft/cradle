"""View for updating a user's access level on an entity."""

from typing import cast
from uuid import UUID

from django.db import transaction
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
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
from user.authentication import CookieJWTAuthentication
from user.exceptions import UserErrorCodes, UserNotFoundException
from user.models import CradleUser

from ..enums import AccessType
from ..exceptions import AccessChangeNotAllowedException, AccessErrorCodes
from ..models import Access
from ..serializers import AccessSerializer


@extend_schema_view(
    put=extend_schema(
        operation_id="access_user_update",
        summary="Update user access for entity",
        description="Updates a user's access privileges for a specific entity. Admins and managers can update access for non-admin users.",  # noqa: E501
        parameters=[
            OpenApiParameter(
                name="user_id",
                type=str,
                location=OpenApiParameter.PATH,
                description="UUID of the user whose access is being updated",
            ),
            OpenApiParameter(
                name="entity_id",
                type=int,
                location=OpenApiParameter.PATH,
                description="ID of the entity to update access for",
            ),
        ],
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
    """Update a user's access level for an entity (admins and managers)."""

    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAuthenticated]
    serializer_class = AccessSerializer

    def __can_update_access(self, request_user: CradleUser, updated_user: CradleUser) -> bool:
        """Whether request_user may change updated_user's access.

        Managers and admins may, for any non-admin user (admins can access everything).
        """
        return request_user.is_manager and not updated_user.is_cradle_admin

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

        user: CradleUser = cast(CradleUser, request.user)
        if not self.__can_update_access(user, updated_user):
            raise AccessChangeNotAllowedException(
                detail="You do not have permission to change this user's access for this entity."
            )

        updated_access, _ = Access.objects.get_or_create(user=updated_user, entity=updated_entity)

        serializer = AccessSerializer(updated_access, data=request.data)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            serializer.save()
            access_type = serializer.validated_data["access_type"]
            access_label = str(AccessType(access_type).label)
            AccessGrantedNotification.objects.create(
                user=updated_user,
                entity=updated_entity,
                message=f'Your access to "{updated_entity.name}" was changed to {access_label}.',
            )

        return Response(serializer.data, status=status.HTTP_200_OK)
