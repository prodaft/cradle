from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from ..models import Access
from ..enums import AccessType
from entries.models import Entry
from notifications.models import AccessRequestNotification
from django.db import transaction
from user.models import CradleUser
from typing import cast

from uuid import UUID


class RequestAccess(APIView):

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request: Request, entity_id: UUID) -> Response:
        """Allows a user to request access for an Entity. All users with read-write
        access for that specific Entity will receive a Notification. If the user
        making the request already has read-write access, no Notifications are
        sent but the request is deemed successful.

        Args:
            request: The request that was sent
            user_id: Id of the entity for which the user requests access

        Returns:
            Response(status=200):
                if the request was successful
            Response("User is not authenticated", status=401):
                if the user is not authenticated
            Response("Entity does not exist", status=404):
                if the entity does not exist
        """

        user: CradleUser = cast(CradleUser, request.user)

        try:
            entity = Entry.objects.get(id=entity_id)
        except Entry.DoesNotExist:
            return Response("Entity does not exist", status=status.HTTP_404_NOT_FOUND)

        if user.is_superuser or Access.objects.filter(
            user=user, entity=entity, access_type=AccessType.READ_WRITE
        ):
            return Response(status=status.HTTP_200_OK)

        notified_user_ids = Access.objects.get_users_with_access(entity.id)
        with transaction.atomic():
            for notified_user_id in notified_user_ids:
                AccessRequestNotification.objects.create(
                    user_id=notified_user_id,
                    requesting_user=user,
                    entity=entity,
                    message=(
                        f"User {user.username} has requested access for "
                        f"entity {entity.name}"
                    ),
                )

            return Response(status=status.HTTP_200_OK)
