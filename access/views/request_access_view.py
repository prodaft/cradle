from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from logs.decorators import log_failed_responses
from ..models import Access
from ..enums import AccessType
from entities.models import Entity
from notifications.models import AccessRequestNotification
from django.db import transaction
from user.models import CradleUser
from typing import cast


class RequestAccess(APIView):

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    @log_failed_responses
    def post(self, request: Request, case_id: int) -> Response:
        """Allows a user to request access for a Case. All users with read-write
        access for that specific Case will receive a Notification. If the user
        making the request already has read-write access, no Notifications are
        sent but the request is deemed successful.

        Args:
            request: The request that was sent
            user_id: Id of the case for which the user requests access

        Returns:
            Response(status=200):
                if the request was successful
            Response("User is not authenticated", status=401):
                if the user is not authenticated
            Response("Case does not exist", status=404):
                if the case does not exist
        """

        user: CradleUser = cast(CradleUser, request.user)

        try:
            case = Entity.objects.get(id=case_id)
        except Entity.DoesNotExist:
            return Response("Case does not exist", status=status.HTTP_404_NOT_FOUND)

        if user.is_superuser or Access.objects.filter(
            user=user, case=case, access_type=AccessType.READ_WRITE
        ):
            return Response(status=status.HTTP_200_OK)

        notified_user_ids = Access.objects.get_users_with_access(case.id)
        with transaction.atomic():
            for notified_user_id in notified_user_ids:
                AccessRequestNotification.objects.create(
                    user_id=notified_user_id,
                    requesting_user=user,
                    case=case,
                    message=(
                        f"User {user.username} has requested access for "
                        f"case {case.name}"
                    ),
                )

            return Response(status=status.HTTP_200_OK)
