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
from rest_framework_simplejwt.authentication import JWTAuthentication

from core.exceptions import CoreErrorCodes
from core.openapi import get_common_error_responses, get_error_responses
from entries.exceptions import EntityNotFoundException, EntriesErrorCodes
from entries.models import Entry
from notifications.models import AccessGrantedNotification
from user.exceptions import UserErrorCodes, UserNotFoundException
from user.models import CradleUser

from ..enums import AccessType
from ..exceptions import AccessErrorCodes, UpdateNotAllowedException
from ..models import Access
from ..serializers import AccessSerializer


@extend_schema_view(
    put=extend_schema(
        operation_id="access_user_update",
        summary="Update user access for entity",
        description="Updates a user's access privileges for a specific entity. Admin users can update access for non-admin users. Users with read-write access can update access for non-admin users who don't have read-write access.",  # noqa: E501
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
                AccessErrorCodes.UPDATE_NOT_ALLOWED,
                CoreErrorCodes.INVALID_REQUEST,
                include_validation_error=True,
            ),
            **get_common_error_responses(),
        },
    )
)
class UpdateAccess(APIView):
    """Update a user's access level for an entity (admin or read-write users)."""

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    serializer_class = AccessSerializer

    def __can_update_access(self, request_user: CradleUser, updated_user: CradleUser, updated_entity: Entry) -> bool:
        """Determines whether request_user can change updated_user's access for updated_entity.

        Rules: (1) Admin can change non-admin access. (2) Read-write user can change
        access if updated_user is not admin and lacks read-write. (3) Read/none cannot.

        Args:
            request_user: User making the request.
            updated_user: User whose access is to be updated.
            updated_entity: Entity for which the access is to be updated.

        Returns:
            True if the access can be changed; False otherwise.
        """
        if request_user.is_cradle_admin:
            # Entity 1: user is a superuser
            if updated_user.is_cradle_admin:
                return False

        elif Access.objects.check_user_access(request_user, updated_entity, AccessType.READ_WRITE):
            # Entity 2: user has read-write access
            if updated_user.is_cradle_admin or Access.objects.check_user_access(
                updated_user, updated_entity, AccessType.READ_WRITE
            ):
                return False

        else:
            # Entity 3: the user does not have permission
            return False

        return True

    def put(self, request: Request, user_id: UUID, entity_id: int) -> Response:
        """Update a user's access for an entity. See schema for permission rules."""
        try:
            updated_user = CradleUser.objects.get(id=user_id)
        except CradleUser.DoesNotExist:
            raise UserNotFoundException(detail="There is no user with the specified ID.")

        try:
            updated_entity = Entry.entities.get(id=entity_id)
        except Entry.DoesNotExist:
            raise EntityNotFoundException(detail="There is no entity with the specified ID.")

        user: CradleUser = cast(CradleUser, request.user)
        if not self.__can_update_access(user, updated_user, updated_entity):
            raise UpdateNotAllowedException(detail="User is not allowed to perform this operation")

        updated_access, _ = Access.objects.get_or_create(user=updated_user, entity=updated_entity)

        serializer = AccessSerializer(updated_access, data=request.data)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            serializer.save()
            access_type = serializer.validated_data["access_type"]
            AccessGrantedNotification.objects.create(
                user=updated_user,
                entity=updated_entity,
                message=f"Your access for entity {updated_entity.name} has been changed to {access_type}",
            )

        return Response(serializer.data, status=status.HTTP_200_OK)
