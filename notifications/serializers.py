from rest_framework import serializers
from .models import MessageNotification, AccessRequestNotification
from typing import Any, Optional


class NotificationSerializer(serializers.ModelSerializer):
    def to_representation(self, instance: Any) -> dict[str, Any]:
        """Determines the type of notification and serializes the data accordingly.

        Args:
            instance: The notification to be serialized.

        Returns:
            A dictionary containing the serialized Notification entity.
        """

        serializer: Optional[serializers.ModelSerializer] = None
        if isinstance(instance, AccessRequestNotification):
            serializer = AccessRequestNotificationSerializer(instance)
        else:
            serializer = MessageNotificationSerializer(instance)

        return serializer.data


class MessageNotificationSerializer(serializers.ModelSerializer):
    notification_type = serializers.CharField(
        default="message_notification", read_only=True
    )

    class Meta:
        model = MessageNotification
        fields = ["id", "message", "timestamp", "notification_type"]


class AccessRequestNotificationSerializer(serializers.ModelSerializer):
    notification_type = serializers.CharField(
        default="request_access_notification", read_only=True
    )

    class Meta:
        model = AccessRequestNotification
        fields = [
            "id",
            "message",
            "case_id",
            "requesting_user_id",
            "timestamp",
            "notification_type",
        ]
