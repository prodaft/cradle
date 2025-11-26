from typing import Any

from rest_framework import serializers

from user.serializers import EssentialUserRetrieveSerializer

from .models import (
    AccessRequestNotification,
    MessageNotification,
    NewUserNotification,
    ReportProcessingErrorNotification,
    ReportRenderNotification,
)


class MessageNotificationSerializer(serializers.ModelSerializer):
    notification_type = "message_notification"

    class Meta:
        model = MessageNotification
        fields = ["id", "message", "is_marked_unread", "timestamp"]


class NewUserNotificationSerializer(serializers.ModelSerializer):
    notification_type = "new_user_notification"
    new_user = EssentialUserRetrieveSerializer()

    class Meta:
        model = AccessRequestNotification
        fields = [
            "id",
            "message",
            "is_marked_unread",
            "timestamp",
            "new_user",
        ]


class AccessRequestNotificationSerializer(serializers.ModelSerializer):
    notification_type = "request_access_notification"

    class Meta:
        model = AccessRequestNotification
        fields = [
            "id",
            "message",
            "is_marked_unread",
            "entity_id",
            "requesting_user_id",
            "timestamp",
        ]


class ReportRenderNotificationSerializer(serializers.ModelSerializer):
    notification_type = "report_render_notification"
    published_report_id = serializers.UUIDField(source="published_report.id")

    class Meta:
        model = ReportRenderNotification
        fields = [
            "id",
            "message",
            "is_marked_unread",
            "timestamp",
            "published_report_id",
        ]


class ReportProcessingErrorNotificationSerializer(serializers.ModelSerializer):
    notification_type = "report_processing_error_notification"
    published_report_id = serializers.UUIDField(source="published_report.id")

    class Meta:
        model = ReportProcessingErrorNotification
        fields = [
            "id",
            "message",
            "is_marked_unread",
            "timestamp",
            "published_report_id",
            "error_message",
        ]


NOTIFICATION_SERIALIZER_MAP: dict[type, type[serializers.ModelSerializer]] = {
    MessageNotification: MessageNotificationSerializer,
    NewUserNotification: NewUserNotificationSerializer,
    AccessRequestNotification: AccessRequestNotificationSerializer,
    ReportRenderNotification: ReportRenderNotificationSerializer,
    ReportProcessingErrorNotification: ReportProcessingErrorNotificationSerializer,
}


class NotificationSerializer(serializers.ModelSerializer):
    """
    Polymorphic serializer that dispatches to the correct
    notification-specific serializer.
    """

    class Meta:
        fields = []

    def to_representation(self, instance: Any) -> dict[str, Any]:
        model_class = instance.__class__

        serializer_class = NOTIFICATION_SERIALIZER_MAP.get(
            model_class, MessageNotificationSerializer
        )

        data = serializer_class(instance, context=self.context).data
        data["notification_type"] = serializer_class.notification_type


class UpdateNotificationSerializer(serializers.ModelSerializer):
    is_marked_unread = serializers.BooleanField(required=True)

    class Meta:
        model = MessageNotification
        fields = ["is_marked_unread"]


class UnreadNotificationsSerializer(serializers.Serializer):
    count = serializers.IntegerField()
