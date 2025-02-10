from drf_spectacular.utils import extend_schema
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

    @extend_schema(
        summary="Fetch Notifications",
        description="Retrieve all notifications for the authenticated user, sorted from newest to oldest.",
        responses={200: NotificationSerializer(many=True), 401: "Unauthorized"},
    )
    def get(self, request: Request) -> Response:
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

    @extend_schema(
        summary="Update Notification",
        description="Update a notification's read/unread status by providing its ID.",
        request=UpdateNotificationSerializer,
        responses={
            200: "Notification updated successfully",
            400: "Invalid request body",
            404: "Notification not found",
            401: "Unauthorized",
        },
    )
    def put(self, request: Request, notification_id: int) -> Response:
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

    @extend_schema(
        summary="Unread Notifications Count",
        description="Retrieve the number of unread notifications for the authenticated user.",
        responses={200: UnreadNotificationsSerializer, 401: "Unauthorized"},
    )
    def get(self, request: Request) -> Response:
        response_data = {}
        response_data["count"] = (
            MessageNotification.objects.filter(user=request.user)
            .filter(Q(is_marked_unread=True) | Q(is_unread=True))
            .count()
        )

        return Response(
            UnreadNotificationsSerializer(response_data).data,
        )
