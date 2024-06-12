from rest_framework.response import Response
from rest_framework.request import Request
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.permissions import IsAuthenticated
from logs.decorators import log_failed_responses
from ..models import MessageNotification
from ..serializers import NotificationSerializer
from user.models import CradleUser
from typing import cast


class NotificationList(APIView):

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    @log_failed_responses
    def get(self, request: Request) -> Response:
        """Fetches all of the user's notifications. The notifications
        are sorted from the newest to the oldest one.

        Args:
            request: The request that was sent

        Returns:
            Response(status=200): Returns a list of all notifications.
            Response("User is not authenticated.",
                status=401): if the user is not authenticated
        """

        notifications = (
            MessageNotification.objects.filter(user=cast(CradleUser, request.user))
            .select_subclasses()  # type: ignore
            .order_by("-timestamp")
        )

        serializer = NotificationSerializer(notifications, many=True)
        return Response(serializer.data)
