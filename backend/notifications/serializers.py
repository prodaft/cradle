"""Serializers for notification API responses."""

from typing import Any

from rest_framework import serializers

from user.serializers import EssentialUserRetrieveSerializer

from .models import (
    AccessGrantedNotification,
    AccessRequestNotification,
    EnrichmentCompleteNotification,
    EnrichmentErrorNotification,
    MessageNotification,
    NewUserNotification,
    ReportProcessingErrorNotification,
    ReportRenderNotification,
)

_NOTIFICATION_TYPE_HELP = "Discriminator for polymorphic type."


class NotificationTypeMixin:
    """Mixin that adds notification_type discriminator from notification_type_value."""

    notification_type = serializers.SerializerMethodField(help_text=_NOTIFICATION_TYPE_HELP)
    notification_type_value: str = "message_notification"

    def get_notification_type(self, obj: Any) -> str:
        """Return the notification type discriminator."""
        return self.notification_type_value


class MessageNotificationSerializer(NotificationTypeMixin, serializers.ModelSerializer):
    """Base notification serializer with common fields."""

    notification_type = serializers.SerializerMethodField(help_text=_NOTIFICATION_TYPE_HELP)

    class Meta:
        model = MessageNotification
        fields = ["id", "message", "is_marked_unread", "timestamp", "notification_type"]


class AccessGrantedNotificationSerializer(NotificationTypeMixin, serializers.ModelSerializer):
    """Serializer for access granted notifications."""

    notification_type = serializers.SerializerMethodField(help_text=_NOTIFICATION_TYPE_HELP)
    notification_type_value = "access_granted_notification"
    entity_id = serializers.IntegerField(source="entity.id", help_text="ID of the entity access was granted for.")

    class Meta:
        model = AccessGrantedNotification
        fields = [
            "id",
            "message",
            "is_marked_unread",
            "entity_id",
            "timestamp",
            "notification_type",
        ]


class NewUserNotificationSerializer(NotificationTypeMixin, serializers.ModelSerializer):
    """Serializer for new user registration notifications."""

    notification_type = serializers.SerializerMethodField(help_text=_NOTIFICATION_TYPE_HELP)
    notification_type_value = "new_user_notification"
    new_user = EssentialUserRetrieveSerializer(help_text="The newly registered user.")

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


class AccessRequestNotificationSerializer(NotificationTypeMixin, serializers.ModelSerializer):
    """Serializer for access request notifications."""

    notification_type = serializers.SerializerMethodField(help_text=_NOTIFICATION_TYPE_HELP)
    notification_type_value = "request_access_notification"
    entity_id = serializers.IntegerField(source="entity.id", help_text="ID of the entity access was requested for.")
    requesting_user_id = serializers.UUIDField(
        source="requesting_user.id", help_text="ID of the user who requested access."
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


class ReportRenderNotificationSerializer(NotificationTypeMixin, serializers.ModelSerializer):
    """Serializer for report ready notifications."""

    notification_type = serializers.SerializerMethodField(help_text=_NOTIFICATION_TYPE_HELP)
    notification_type_value = "report_render_notification"
    published_report_id = serializers.UUIDField(source="published_report.id", help_text="ID of the published report.")

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


class ReportProcessingErrorNotificationSerializer(NotificationTypeMixin, serializers.ModelSerializer):
    """Serializer for report processing error notifications."""

    notification_type = serializers.SerializerMethodField(help_text=_NOTIFICATION_TYPE_HELP)
    notification_type_value = "report_processing_error_notification"
    published_report_id = serializers.UUIDField(source="published_report.id", help_text="ID of the report that failed.")

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


class EnrichmentCompleteNotificationSerializer(NotificationTypeMixin, serializers.ModelSerializer):
    """Serializer for enrichment complete notifications."""

    notification_type = serializers.SerializerMethodField(help_text=_NOTIFICATION_TYPE_HELP)
    notification_type_value = "enrichment_complete_notification"
    enrichment_request_id = serializers.UUIDField(
        source="enrichment_request.id", help_text="ID of the completed enrichment request."
    )

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


class EnrichmentErrorNotificationSerializer(NotificationTypeMixin, serializers.ModelSerializer):
    """Serializer for enrichment error notifications."""

    notification_type = serializers.SerializerMethodField(help_text=_NOTIFICATION_TYPE_HELP)
    notification_type_value = "enrichment_error_notification"
    enrichment_request_id = serializers.UUIDField(
        source="enrichment_request.id", help_text="ID of the failed enrichment request."
    )

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


# Maps notification model classes to their serializers for polymorphic dispatch.
NOTIFICATION_SERIALIZER_MAP: dict[type, type[serializers.ModelSerializer]] = {
    MessageNotification: MessageNotificationSerializer,
    AccessGrantedNotification: AccessGrantedNotificationSerializer,
    NewUserNotification: NewUserNotificationSerializer,
    AccessRequestNotification: AccessRequestNotificationSerializer,
    ReportRenderNotification: ReportRenderNotificationSerializer,
    ReportProcessingErrorNotification: ReportProcessingErrorNotificationSerializer,
    EnrichmentCompleteNotification: EnrichmentCompleteNotificationSerializer,
    EnrichmentErrorNotification: EnrichmentErrorNotificationSerializer,
}


class NotificationSerializer(serializers.ModelSerializer):
    """Polymorphic serializer that dispatches to notification-specific serializers."""

    class Meta:
        fields = []

    def to_representation(self, instance: Any) -> dict[str, Any]:
        """Dispatch to the appropriate serializer based on notification subclass."""
        model_class = instance.__class__

        serializer_class = NOTIFICATION_SERIALIZER_MAP.get(model_class, MessageNotificationSerializer)

        data = serializer_class(instance, context=self.context).data
        return data


class UpdateNotificationSerializer(serializers.ModelSerializer):
    """Serializer for updating notification read/unread status."""

    is_marked_unread = serializers.BooleanField(required=True, help_text="Whether to mark the notification as unread.")

    class Meta:
        model = MessageNotification
        fields = ["is_marked_unread"]


class UnreadNotificationsSerializer(serializers.Serializer):
    """Serializer for unread notification count response."""

    count = serializers.IntegerField(help_text="Number of unread notifications.")
