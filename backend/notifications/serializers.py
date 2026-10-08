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


class MessageNotificationSerializer(serializers.ModelSerializer):
    """Base notification serializer with common fields; subclasses set ``type_value`` and their own Meta."""

    type = serializers.SerializerMethodField(help_text="Discriminator for polymorphic type.")
    type_value: str = "message_notification"
    is_unread = serializers.SerializerMethodField(
        help_text="Whether the notification is unread: not yet seen, or marked unread by the user."
    )
    created_at = serializers.DateTimeField(
        source="timestamp", read_only=True, help_text="When the notification was created."
    )

    class Meta:
        model = MessageNotification
        fields = ["id", "message", "is_unread", "created_at", "type"]

    def get_type(self, obj: Any) -> str:
        """Return the notification type discriminator."""
        return self.type_value

    def get_is_unread(self, obj: MessageNotification) -> bool:
        return obj.is_unread or obj.is_marked_unread


class AccessGrantedNotificationSerializer(MessageNotificationSerializer):
    """Serializer for access granted notifications."""

    type_value = "access_granted_notification"
    entity_id = serializers.IntegerField(source="entity.id", help_text="ID of the entity access was granted for.")

    class Meta:
        model = AccessGrantedNotification
        fields = ["id", "message", "is_unread", "entity_id", "created_at", "type"]


class NewUserNotificationSerializer(MessageNotificationSerializer):
    """Serializer for new user registration notifications."""

    type_value = "new_user_notification"
    new_user = EssentialUserRetrieveSerializer(help_text="The newly registered user.")

    class Meta:
        model = NewUserNotification
        fields = ["id", "message", "is_unread", "created_at", "new_user", "type"]


class AccessRequestNotificationSerializer(MessageNotificationSerializer):
    """Serializer for access request notifications."""

    type_value = "request_access_notification"
    entity_id = serializers.IntegerField(source="entity.id", help_text="ID of the entity access was requested for.")
    requesting_user_id = serializers.UUIDField(
        source="requesting_user.id", help_text="ID of the user who requested access."
    )

    class Meta:
        model = AccessRequestNotification
        fields = ["id", "message", "is_unread", "entity_id", "requesting_user_id", "created_at", "type"]


class ReportRenderNotificationSerializer(MessageNotificationSerializer):
    """Serializer for report ready notifications."""

    type_value = "report_render_notification"
    report_id = serializers.UUIDField(source="published_report.id", help_text="ID of the published report.")

    class Meta:
        model = ReportRenderNotification
        fields = ["id", "message", "is_unread", "created_at", "report_id", "type"]


class ReportProcessingErrorNotificationSerializer(MessageNotificationSerializer):
    """Serializer for report processing error notifications."""

    type_value = "report_processing_error_notification"
    report_id = serializers.UUIDField(source="published_report.id", help_text="ID of the report that failed.")

    class Meta:
        model = ReportProcessingErrorNotification
        fields = ["id", "message", "is_unread", "created_at", "report_id", "error_message", "type"]


class EnrichmentCompleteNotificationSerializer(MessageNotificationSerializer):
    """Serializer for enrichment complete notifications."""

    type_value = "enrichment_complete_notification"
    enrichment_request_id = serializers.UUIDField(
        source="enrichment_request.id", help_text="ID of the completed enrichment request."
    )

    class Meta:
        model = EnrichmentCompleteNotification
        fields = ["id", "message", "is_unread", "created_at", "enrichment_request_id", "type"]


class EnrichmentErrorNotificationSerializer(MessageNotificationSerializer):
    """Serializer for enrichment error notifications."""

    type_value = "enrichment_error_notification"
    enrichment_request_id = serializers.UUIDField(
        source="enrichment_request.id", help_text="ID of the failed enrichment request."
    )

    class Meta:
        model = EnrichmentErrorNotification
        fields = ["id", "message", "is_unread", "created_at", "enrichment_request_id", "error_message", "type"]


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

    is_unread = serializers.BooleanField(
        required=True, help_text="true marks the notification unread; false marks it read (seen and not marked)."
    )

    class Meta:
        model = MessageNotification
        fields = ["is_unread"]

    def update(self, instance: MessageNotification, validated_data: dict[str, Any]) -> MessageNotification:
        instance.is_marked_unread = validated_data["is_unread"]
        if not instance.is_marked_unread:
            instance.is_unread = False
        instance.save(update_fields=["is_marked_unread", "is_unread"])
        return instance


class UnreadNotificationsSerializer(serializers.Serializer):
    """Serializer for unread notification count response."""

    count = serializers.IntegerField(help_text="Number of unread notifications.")
