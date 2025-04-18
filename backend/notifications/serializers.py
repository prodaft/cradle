from rest_framework import serializers

from user.serializers import EssentialUserRetrieveSerializer
from .models import (
    MessageNotification,
    AccessRequestNotification,
    NewUserNotification,
    ReportProcessingErrorNotification,
    ReportRenderNotification,
)
from typing import Any, Optional


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = MessageNotification
        fields = []

    def to_representation(self, instance: Any) -> dict[str, Any]:
        """Determines the type of notification and serializes the data accordingly.

        Args:
            instance: The notification to be serialized.

        Returns:
            A dictionary containing the serialized Notification entry.
        """

        serializer: Optional[serializers.ModelSerializer] = None
        if isinstance(instance, ReportRenderNotification):
            serializer = ReportRenderNotificationSerializer(instance)
        elif isinstance(instance, ReportProcessingErrorNotification):
            serializer = ReportProcessingErrorNotificationSerializer(instance)
        elif isinstance(instance, AccessRequestNotification):
            serializer = AccessRequestNotificationSerializer(instance)
        elif isinstance(instance, NewUserNotification):
            serializer = NewUserNotificationSerializer(instance)
        else:
            serializer = MessageNotificationSerializer(instance)

        return serializer.data

        return serializer.data


class MessageNotificationSerializer(serializers.ModelSerializer):
    notification_type = serializers.CharField(
        default="message_notification", read_only=True
    )

    class Meta:
        model = MessageNotification
        fields = ["id", "message", "is_marked_unread", "timestamp", "notification_type"]


class NewUserNotificationSerializer(serializers.ModelSerializer):
    notification_type = serializers.CharField(
        default="new_user_notification", read_only=True
    )
    new_user = EssentialUserRetrieveSerializer()

    class Meta:
        model = AccessRequestNotification
        fields = [
            "id",
            "message",
            "is_marked_unread",
            "timestamp",
            "notification_type",
            "new_user",
        ]


class AccessRequestNotificationSerializer(serializers.ModelSerializer):
    notification_type = serializers.CharField(
        default="request_access_notification", read_only=True
    )

    class Meta:
        model = AccessRequestNotification
        fields = [
            "id",
            "message",
            "is_marked_unread",
            "entity_id",
            "requesting_user_id",
            "timestamp",
            "notification_type",
        ]


class ReportRenderNotificationSerializer(serializers.ModelSerializer):
    notification_type = serializers.CharField(
        default="report_render_notification", read_only=True
    )
    published_report_id = serializers.UUIDField(source="published_report.id")

    class Meta:
        model = ReportRenderNotification
        fields = [
            "id",
            "message",
            "is_marked_unread",
            "timestamp",
            "notification_type",
            "published_report_id",
        ]


class ReportProcessingErrorNotificationSerializer(serializers.ModelSerializer):
    notification_type = serializers.CharField(
        default="report_processing_error_notification", read_only=True
    )
    published_report_id = serializers.UUIDField(source="published_report.id")

    class Meta:
        model = ReportProcessingErrorNotification
        fields = [
            "id",
            "message",
            "is_marked_unread",
            "timestamp",
            "notification_type",
            "published_report_id",
            "error_message",
        ]


class UpdateNotificationSerializer(serializers.ModelSerializer):
    is_marked_unread = serializers.BooleanField(required=True)

    class Meta:
        model = MessageNotification
        fields = ["is_marked_unread"]


class UnreadNotificationsSerializer(serializers.Serializer):
    count = serializers.IntegerField()
