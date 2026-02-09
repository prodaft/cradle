from typing import cast

from django.db.models import Case, Q, When
from drf_spectacular.utils import (
    OpenApiParameter,
    PolymorphicProxySerializer,
    extend_schema,
    extend_schema_view,
    inline_serializer,
)
from rest_framework import serializers, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from core.exceptions import BadRequestException
from core.openapi import get_common_error_responses
from core.pagination import TotalPagesPagination
from notifications.exceptions import InvalidPageSizeException, NotificationNotFoundException
from user.models import CradleUser

from ..models import MessageNotification
from ..serializers import (
    AccessRequestNotificationSerializer,
    EnrichmentCompleteNotificationSerializer,
    EnrichmentErrorNotificationSerializer,
    MessageNotificationSerializer,
    NewUserNotificationSerializer,
    NotificationSerializer,
    ReportProcessingErrorNotificationSerializer,
    ReportRenderNotificationSerializer,
    UnreadNotificationsSerializer,
    UpdateNotificationSerializer,
)


@extend_schema_view(
    get=extend_schema(
        summary="Fetch Notifications",
        description="Retrieve paginated notifications for the authenticated user, sorted with unread notifications first, then by newest to oldest.",  # noqa: E501
        parameters=[
            OpenApiParameter(
                name="page_size",
                type=int,
                location=OpenApiParameter.QUERY,
                description="Number of notifications to return per page. Max 200.",
                default=10,
            ),
            OpenApiParameter(
                name="page",
                type=int,
                location=OpenApiParameter.QUERY,
                description="Page number for pagination",
            ),
        ],
        responses={
            200: inline_serializer(
                name="PaginatedNotificationResponse",
                fields={
                    "page": serializers.IntegerField(help_text="Current page number"),
                    "count": serializers.IntegerField(help_text="Total number of items"),
                    "total_pages": serializers.IntegerField(help_text="Total number of pages"),
                    "results": PolymorphicProxySerializer(
                        component_name="Notification",
                        serializers=[
                            MessageNotificationSerializer,
                            NewUserNotificationSerializer,
                            AccessRequestNotificationSerializer,
                            ReportRenderNotificationSerializer,
                            ReportProcessingErrorNotificationSerializer,
                            EnrichmentCompleteNotificationSerializer,
                            EnrichmentErrorNotificationSerializer,
                        ],
                        resource_type_field_name="notification_type",
                        many=True,
                    ),
                },
            ),
            **get_common_error_responses(),
        },
    ),
)
class NotificationList(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    pagination_class = TotalPagesPagination

    def get(self, request: Request) -> Response:
        try:
            page_size = int(request.query_params.get("page_size", 10))
        except ValueError:
            raise InvalidPageSizeException(detail="Invalid page_size value. Must be an integer.")

        if page_size > 200:
            raise InvalidPageSizeException(detail="page_size cannot be greater than 200.")

        notifications = (
            MessageNotification.objects.filter(user=cast(CradleUser, request.user))
            .select_subclasses()  # type: ignore
            .annotate(
                is_unread_status=Case(
                    When(Q(is_unread=True) | Q(is_marked_unread=True), then=True),
                    default=False,
                )
            )
            .order_by("-is_unread_status", "-timestamp")
        )

        # Mark notifications as read (update only unread ones)
        MessageNotification.objects.filter(user=cast(CradleUser, request.user), is_unread=True).update(is_unread=False)

        paginator = TotalPagesPagination(page_size=page_size)
        paginated_notifications = paginator.paginate_queryset(notifications, request)

        if paginated_notifications is not None:
            serializer = NotificationSerializer(paginated_notifications, many=True)
            return paginator.get_paginated_response(serializer.data)

        serializer = NotificationSerializer(notifications, many=True)
        return Response(serializer.data)


class NotificationDetail(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Update Notification",
        description="Update a notification's read/unread status by providing its ID.",  # noqa: E501
        request=UpdateNotificationSerializer,
        responses={
            200: {
                "type": "string",
                "description": "Notification updated successfully",
            },
            400: {
                "type": "string",
                "description": "Invalid request body",
            },
            404: {
                "type": "string",
                "description": "Notification not found",
            },
            401: {
                "description": "Unauthorized",
            },
        },
    )
    def put(self, request: Request, notification_id: int) -> Response:
        try:
            notification: MessageNotification = MessageNotification.objects.get(id=notification_id, user=request.user)
        except MessageNotification.DoesNotExist:
            raise NotificationNotFoundException(detail="The notification does not exist.")

        serializer = UpdateNotificationSerializer(notification, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({"message": "Notification updated successfully"}, status=status.HTTP_200_OK)

        raise BadRequestException(detail="Request body is invalid.")


@extend_schema_view(
    get=extend_schema(
        summary="Unread Notifications Count",
        description="Retrieve the number of unread notifications for the authenticated user.",
        responses={
            200: UnreadNotificationsSerializer,
            401: {"description": "Unauthorized"},
        },
    )
)
class NotificationUnread(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

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
