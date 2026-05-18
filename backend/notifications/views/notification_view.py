"""Notification API views: list, detail, and unread count."""

from typing import cast
from uuid import UUID

from django.db import transaction
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

from core.exceptions import CoreErrorCodes
from core.openapi import get_common_error_responses, get_error_responses
from core.pagination import TotalPagesPagination
from user.models import CradleUser

from ..exceptions import NotificationErrorCodes, NotificationNotFoundException
from ..models import MessageNotification
from ..serializers import (
    AccessGrantedNotificationSerializer,
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


def _get_notification_or_404(user: CradleUser, notification_id: UUID) -> MessageNotification:
    """Fetch notification by id and user, or raise NotificationNotFoundException."""
    try:
        return MessageNotification.objects.get(id=notification_id, user=user)
    except MessageNotification.DoesNotExist:
        raise NotificationNotFoundException(detail="That notification could not be found.")


@extend_schema_view(
    get=extend_schema(
        operation_id="notifications_list",
        summary="Fetch Notifications",
        description=(
            "Retrieve paginated notifications for the authenticated user, sorted with unread "
            "notifications first, then by newest to oldest. When ``unread_only`` is true, only unread "
            "rows are returned and natural unreads are not cleared; otherwise opening the list marks "
            "natural unreads (``is_unread``) as read for the user."
        ),  # noqa: E501
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
            OpenApiParameter(
                name="unread_only",
                type=bool,
                location=OpenApiParameter.QUERY,
                description=(
                    "If true, return only notifications that are unread "
                    "(``is_unread`` or ``is_marked_unread``). Does not mark natural unreads as read; "
                    "use the default list without this flag to clear ``is_unread`` for all notifications."
                ),
                required=False,
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
                            AccessGrantedNotificationSerializer,
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
            **get_error_responses(
                CoreErrorCodes.INVALID_PAGE_SIZE,
                CoreErrorCodes.PAGE_SIZE_TOO_LARGE,
            ),
            **get_common_error_responses(),
        },
    ),
)
class NotificationList(APIView):
    """List paginated notifications for the authenticated user."""

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    pagination_class = TotalPagesPagination

    def get(self, request: Request) -> Response:
        """Return paginated notifications, unread first, and mark them as read."""
        user = cast(CradleUser, request.user)
        unread_only = str(request.query_params.get("unread_only", "")).lower() in (
            "1",
            "true",
            "yes",
            "on",
        )

        qs = MessageNotification.objects.filter(user=user)
        if unread_only:
            qs = qs.filter(Q(is_unread=True) | Q(is_marked_unread=True))

        notifications = (
            qs.select_subclasses()  # type: ignore
            .annotate(
                is_unread_status=Case(
                    When(Q(is_unread=True) | Q(is_marked_unread=True), then=True),
                    default=False,
                )
            )
            .order_by("-is_unread_status", "-timestamp")
        )

        if not unread_only:
            MessageNotification.objects.filter(user=user, is_unread=True).update(is_unread=False)

        paginator = self.pagination_class()
        page = paginator.paginate_queryset(notifications, request)
        serializer = NotificationSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)


class NotificationDetail(APIView):
    """Update a single notification (e.g. mark as unread)."""

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    @extend_schema(
        operation_id="notifications_update",
        summary="Update Notification",
        description="Update a notification's read/unread status by providing its ID.",  # noqa: E501
        request=UpdateNotificationSerializer,
        responses={
            204: {"description": "Notification updated successfully"},
            **get_error_responses(
                NotificationErrorCodes.NOTIFICATION_NOT_FOUND,
                include_validation_error=True,
            ),
            **get_common_error_responses(),
        },
    )
    def put(self, request: Request, notification_id: UUID) -> Response:
        """Update notification read/unread status."""
        notification = _get_notification_or_404(cast(CradleUser, request.user), notification_id)
        serializer = UpdateNotificationSerializer(notification, data=request.data)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            serializer.save()
        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema_view(
    get=extend_schema(
        operation_id="notifications_unread_count_retrieve",
        summary="Unread Notifications Count",
        description="Retrieve the number of unread notifications for the authenticated user.",
        responses={
            200: UnreadNotificationsSerializer,
            **get_common_error_responses(),
        },
    )
)
class NotificationUnread(APIView):
    """Return the count of unread notifications."""

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        """Return the number of unread notifications for the user."""
        count = (
            MessageNotification.objects.filter(user=cast(CradleUser, request.user))
            .filter(Q(is_marked_unread=True) | Q(is_unread=True))
            .count()
        )
        return Response(UnreadNotificationsSerializer({"count": count}).data)
