from typing import Any

from rest_framework import serializers

from user.serializers import EssentialUserRetrieveSerializer

from .models import (
    AccessRequestNotification,
    EnrichmentCompleteNotification,
    EnrichmentErrorNotification,
    MessageNotification,
    NewUserNotification,
    ReportProcessingErrorNotification,
    ReportRenderNotification,
)


class MessageNotificationSerializer(serializers.ModelSerializer):
    notification_type = serializers.SerializerMethodField()

    class Meta:
        model = MessageNotification
        fields = ["id", "message", "is_marked_unread", "timestamp", "notification_type"]

    def get_notification_type(self, obj: MessageNotification) -> str:
        return "message_notification"


class NewUserNotificationSerializer(serializers.ModelSerializer):
    notification_type = serializers.SerializerMethodField()
    new_user = EssentialUserRetrieveSerializer()

    class Meta:
        model = NewUserNotification
        fields = [
            "id",
            "message",
            "is_marked_unread",
            "timestamp",
            "new_user",
            "notification_type",
        ]

    def get_notification_type(self, obj: NewUserNotification) -> str:
        return "new_user_notification"


class AccessRequestNotificationSerializer(serializers.ModelSerializer):
    notification_type = serializers.SerializerMethodField()

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

    def get_notification_type(self, obj: AccessRequestNotification) -> str:
        return "request_access_notification"


class ReportRenderNotificationSerializer(serializers.ModelSerializer):
    notification_type = serializers.SerializerMethodField()
    published_report_id = serializers.UUIDField(source="published_report.id")

    class Meta:
        model = ReportRenderNotification
        fields = [
            "id",
            "message",
            "is_marked_unread",
            "timestamp",
            "published_report_id",
            "notification_type",
        ]

    def get_notification_type(self, obj: ReportRenderNotification) -> str:
        return "report_render_notification"


class ReportProcessingErrorNotificationSerializer(serializers.ModelSerializer):
    notification_type = serializers.SerializerMethodField()
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
            "notification_type",
        ]

    def get_notification_type(self, obj: ReportProcessingErrorNotification) -> str:
        return "report_processing_error_notification"


class EnrichmentCompleteNotificationSerializer(serializers.ModelSerializer):
    notification_type = serializers.SerializerMethodField()
    enrichment_request_id = serializers.UUIDField(source="enrichment_request.id")

    class Meta:
        model = EnrichmentCompleteNotification
        fields = [
            "id",
            "message",
            "is_marked_unread",
            "timestamp",
            "enrichment_request_id",
            "notification_type",
        ]

    def get_notification_type(self, obj: EnrichmentCompleteNotification) -> str:
        return "enrichment_complete_notification"


class EnrichmentErrorNotificationSerializer(serializers.ModelSerializer):
    notification_type = serializers.SerializerMethodField()
    enrichment_request_id = serializers.UUIDField(source="enrichment_request.id")

    class Meta:
        model = EnrichmentErrorNotification
        fields = [
            "id",
            "message",
            "is_marked_unread",
            "timestamp",
            "enrichment_request_id",
            "error_message",
            "notification_type",
        ]

    def get_notification_type(self, obj: EnrichmentErrorNotification) -> str:
        return "enrichment_error_notification"


NOTIFICATION_SERIALIZER_MAP: dict[type, type[serializers.ModelSerializer]] = {
    MessageNotification: MessageNotificationSerializer,
    NewUserNotification: NewUserNotificationSerializer,
    AccessRequestNotification: AccessRequestNotificationSerializer,
    ReportRenderNotification: ReportRenderNotificationSerializer,
    ReportProcessingErrorNotification: ReportProcessingErrorNotificationSerializer,
    EnrichmentCompleteNotification: EnrichmentCompleteNotificationSerializer,
    EnrichmentErrorNotification: EnrichmentErrorNotificationSerializer,
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
        return data


class UpdateNotificationSerializer(serializers.ModelSerializer):
    is_marked_unread = serializers.BooleanField(required=True)

    class Meta:
        model = MessageNotification
        fields = ["is_marked_unread"]


class UnreadNotificationsSerializer(serializers.Serializer):
    count = serializers.IntegerField()
