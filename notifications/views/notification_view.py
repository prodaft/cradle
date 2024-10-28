from rest_framework.response import Response
from rest_framework.request import Request
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from ..models import MessageNotification
from ..serializers import NotificationSerializer
from user.models import CradleUser
from typing import cast
from rest_framework import status
from ..serializers import UpdateNotificationSerializer, UnreadNotificationsSerializer


class NotificationList(APIView):

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

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
        notifications.update(is_unread=False)

        serializer = NotificationSerializer(notifications, many=True)
        return Response(serializer.data)


class NotificationDetail(APIView):

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def put(self, request: Request, notification_id: int) -> Response:
        """Updates the notification's is_marked_unread field. Should be
        used when the client wishes to explicitely mark a notification
        as read/unread.

        Args:
            request: The request that was sent. Should contain the
                is_marked_unread attribute in the data field
            notification_id: The id of the notification

        Returns:
            Response("Notification updated successfully", status=200):
                if the notification was updated successfully
            Response("Request body is invalid.", status=400): if the
                request body does not contain the is_marked_unread attribute
            Response("User is not authenticated.", status=401):
                if the user is not authenticated
            Response("The notification does not exist", status=404):
                if the notification does not exist or it isn't owned
                by the user
        """

        try:
            notification: MessageNotification = MessageNotification.objects.get(
                id=notification_id, user=request.user
            )
        except MessageNotification.DoesNotExist:
            return Response(
                "The notification does not exist", status=status.HTTP_404_NOT_FOUND
            )

        serializer = UpdateNotificationSerializer(notification, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(
                "Notification updated successfully", status=status.HTTP_200_OK
            )

        return Response("Request body is invalid.", status=status.HTTP_400_BAD_REQUEST)


class NotificationUnread(APIView):

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        """Returns the number of unread notifications that a user has.
        A notification is considered unread when is_marked_unread OR is_unread
        is true.

        Args:
            request: The request that was sent

        Returns:
            Response(status=200): returns the amount of unread
                notifications
            Response("User is not authenticated.", status=401):
                if the user is not authenticated
        """

        response_data = {}
        response_data["count"] = (
            MessageNotification.objects.filter(user=request.user)
            .filter(Q(is_marked_unread=True) | Q(is_unread=True))
            .count()
        )

        return Response(
            UnreadNotificationsSerializer(response_data).data,
        )
