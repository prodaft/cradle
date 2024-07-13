from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request

from user.models import CradleUser
from entries.models import Entry
from ..models import Access
from ..serializers import AccessSerializer
from logs.decorators import log_failed_responses
from typing import cast
from ..enums import AccessType
from notifications.models import MessageNotification
from django.db import transaction

from uuid import UUID


class UpdateAccess(APIView):

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    serializer_class = AccessSerializer

    def __can_update_access(
        self, request_user: CradleUser, updated_user: CradleUser, updated_entity: Entry
    ) -> bool:
        """Determines whether the request_user can change the access of updated_user
        for entity updated_entity. We can outline three entities:
        1. request_user is an admin: they can change the access of
            updated_user if updated_user is not an admin
        2. request_user has read_write access for updated_entity: they can
            change the access of updated_user if updated_user is not an admin and if
            updated_user does not have read_write access for updated_entity
        3. request_user has either read or none access for updated_entity: they cannot
            change the access of updated_user for updated_entity

        Args:
            request_user: the user making the request
            updated_user: the user whose access is to be updated
            updated_entity: the entity for which the access is to be updated

        Returns:
            True: if the access can be changed
            False: otherwise
        """

        if request_user.is_superuser:
            # Entity 1: user is a superuser
            if updated_user.is_superuser:
                return False

        elif Access.objects.check_user_access(
            request_user, updated_entity, AccessType.READ_WRITE
        ):
            # Entity 2: user has read-write access
            if updated_user.is_superuser or Access.objects.check_user_access(
                updated_user, updated_entity, AccessType.READ_WRITE
            ):
                return False

        else:
            # Entity 3: the user does not have permission
            return False

        return True

    @log_failed_responses
    def put(self, request: Request, user_id: UUID, entity_id: UUID) -> Response:
        """Allows a user to change the access privileges of another user for
        the specified entity. If the user making the request is an admin, they
        can change the permission of any other non-admin user. If the user
        making the request has read-write access for the specified entity, they
        can change the mentioned user's access if that user does not already
        have read-write access and if they are not an admin. Otherwise, they
        are not allowed to perform the operation.

        Args:
            request: The request that was sent
            user_id: Id of the user whose access is updated
            entity_id: Id of the entity to which access is updated

        Returns:
            Response("Access was updated", status=200):
                if the request was successful
            Response("Request is invalid", status=400):
                if the request body is not valid
            Response("User is not authenticated", status=401):
                if the user was not authenticated.
            Response("User is not allowed to perform this operation", status=403):
                if the update request is for an admin user.
            Response("User does not exist.", status=404):
                if the user does not exist.
            Response("Entity does not exist.", status=404):
                if the entity does not exist.
        """

        try:
            updated_user = CradleUser.objects.get(id=user_id)
        except CradleUser.DoesNotExist:
            return Response("User does not exist.", status=status.HTTP_404_NOT_FOUND)

        try:
            updated_entity = Entry.entities.get(id=entity_id)
        except Entry.DoesNotExist:
            return Response("Entity does not exist.", status=status.HTTP_404_NOT_FOUND)

        user: CradleUser = cast(CradleUser, request.user)
        if not self.__can_update_access(user, updated_user, updated_entity):
            return Response(
                "User is not allowed to perform this operation",
                status=status.HTTP_403_FORBIDDEN,
            )

        updated_access, _ = Access.objects.get_or_create(
            user=updated_user, entity=updated_entity
        )

        serializer = AccessSerializer(updated_access, data=request.data)
        if serializer.is_valid():
            with transaction.atomic():
                serializer.save()
                MessageNotification.objects.create(
                    user=updated_user,
                    message=(
                        f"Your access for entity {updated_entity.name} has "
                        f"been changed to {request.data['access_type']}"
                    ),
                )

            return Response("Access has been updated.")

        return Response("Request is invalid", status=status.HTTP_400_BAD_REQUEST)
