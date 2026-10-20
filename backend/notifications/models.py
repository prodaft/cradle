"""Notification models for user-facing alerts (access, reports, enrichments)."""

import logging
import uuid

from django.db import models, transaction
from django_lifecycle import AFTER_CREATE, LifecycleModel, hook

from entries.models import Entry
from mail.models import (
    AccessGrantedMail,
    AccessRequestMail,
    EnrichmentErrorMail,
    EnrichmentReadyMail,
    NewUserNotificationMail,
    ReportErrorMail,
    ReportReadyMail,
)
from teams.rules import access_request_recipients
from user.models import CradleUser

from .managers import NotificationManager
from .realtime import broadcast_notification

logger = logging.getLogger(__name__)

_SOCKET_TYPES = {
    "AccessGrantedNotification": "access_granted_notification",
    "AccessRequestNotification": "request_access_notification",
    "TeamMembershipNotification": "team_membership_notification",
    "NewUserNotification": "new_user_notification",
    "ReportRenderNotification": "report_render_notification",
    "ReportProcessingErrorNotification": "report_processing_error_notification",
    "EnrichmentCompleteNotification": "enrichment_complete_notification",
    "EnrichmentErrorNotification": "enrichment_error_notification",
}


def _socket_type(notification: "MessageNotification") -> str:
    """Type name for the live signal, matching the in-app notification title."""
    return _SOCKET_TYPES.get(type(notification).__name__, "message_notification")


class MessageNotification(LifecycleModel):
    """Base notification model. Dispatches email on creation via get_mail."""

    id: models.UUIDField = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    message: models.CharField = models.CharField(help_text="Human-readable notification text.")
    user: models.ForeignKey = models.ForeignKey(
        CradleUser, on_delete=models.CASCADE, help_text="Recipient of the notification."
    )
    timestamp: models.DateTimeField = models.DateTimeField(
        auto_now_add=True, help_text="When the notification was created."
    )
    is_unread: models.BooleanField = models.BooleanField(
        default=True, help_text="Whether the notification has been read."
    )
    is_marked_unread: models.BooleanField = models.BooleanField(
        default=False, help_text="User manually marked as unread."
    )

    objects = NotificationManager()

    @property
    def shows_as_unread(self) -> bool:
        """Whether the notification shows as unread (never read, or manually marked unread)."""
        return self.is_unread or self.is_marked_unread

    @property
    def get_mail(self):
        """Return the mail instance to send, or None if no email."""
        return None

    @hook(AFTER_CREATE, on_commit=True)
    def broadcast_created(self, *args, **kwargs):
        """Signal open clients to refetch once the row is committed."""
        broadcast_notification(self.user_id, self.message, _socket_type(self), str(self.id))

    @hook(AFTER_CREATE, on_commit=True)
    def send_mail(self, *args, **kwargs):
        """Queue the notification email once the row is committed.

        Failures are logged; the notification is already saved, so a broker error must not fail the request.
        """
        try:
            mail = self.get_mail
            if mail:
                mail.dispatch()
        except Exception:
            logger.exception("Failed to queue the email for notification %s", self.id)


class AccessGrantedNotification(MessageNotification):
    """Notification when access to an entity is granted."""

    entity: models.ForeignKey = models.ForeignKey(
        Entry, on_delete=models.CASCADE, help_text="Entity access was granted for."
    )

    @property
    def get_mail(self):
        """Return AccessGrantedMail for the entity access grant."""
        return AccessGrantedMail(self.user, self.entity)


class AccessRequestNotification(MessageNotification):
    """Notification when another user requests access to an entity."""

    requesting_user: models.ForeignKey = models.ForeignKey(
        CradleUser, on_delete=models.CASCADE, help_text="User who requested access."
    )
    entity: models.ForeignKey = models.ForeignKey(
        Entry, on_delete=models.CASCADE, help_text="Entity access was requested for."
    )

    @property
    def get_mail(self):
        """Return AccessRequestMail for the access request."""
        return AccessRequestMail(self.user, self.requesting_user, self.entity)

    @classmethod
    def notify_granters(cls, requesting_user: CradleUser, entity: Entry, message: str) -> None:
        """Notify everyone who decides access to ``entity`` that ``requesting_user`` asked for it.

        One notification per recipient (see ``teams.rules.access_request_recipients``); each is saved on its own so
        its broadcast and email hooks run.
        """
        with transaction.atomic():
            for recipient_id in access_request_recipients(entity).values_list("id", flat=True):
                cls.objects.create(
                    user_id=recipient_id, requesting_user=requesting_user, entity=entity, message=message
                )


class TeamMembershipNotification(MessageNotification):
    """Notification when the recipient is added to a team or their team role changes."""

    team: models.ForeignKey = models.ForeignKey(
        "teams.Team", on_delete=models.CASCADE, help_text="Team the recipient was added to."
    )


class NewUserNotification(MessageNotification):
    """Notification when a new user registers."""

    new_user: models.ForeignKey = models.ForeignKey(
        CradleUser, on_delete=models.CASCADE, help_text="Newly registered user."
    )

    @property
    def get_mail(self):
        """Return NewUserNotificationMail for the new user."""
        return NewUserNotificationMail(self.user, self.new_user)


class ReportRenderNotification(MessageNotification):
    """Notification when a published report is ready for download."""

    published_report: models.ForeignKey = models.ForeignKey(
        "publish.PublishedReport",
        on_delete=models.CASCADE,
        related_name="render_notifications",
        help_text="Report that finished rendering.",
    )

    @property
    def get_mail(self):
        """Return ReportReadyMail for the published report."""
        return ReportReadyMail(self.user, self.published_report)


class ReportProcessingErrorNotification(MessageNotification):
    """Notification when report processing fails."""

    published_report: models.ForeignKey = models.ForeignKey(
        "publish.PublishedReport",
        on_delete=models.CASCADE,
        related_name="processing_error_notifications",
        help_text="Report that failed to process.",
    )
    error_message: models.TextField = models.TextField(
        blank=True, null=True, help_text="Error details from the processing failure."
    )

    @property
    def get_mail(self):
        """Return ReportErrorMail for the processing failure."""
        return ReportErrorMail(self.user, self.published_report, self.error_message)


class EnrichmentCompleteNotification(MessageNotification):
    """Notification when an enrichment request completes successfully."""

    enrichment_request: models.ForeignKey = models.ForeignKey(
        "intelio.EnrichmentRequest",
        on_delete=models.CASCADE,
        related_name="complete_notifications",
        help_text="Enrichment request that completed.",
    )

    @property
    def get_mail(self):
        """Return EnrichmentReadyMail for the completed enrichment."""
        return EnrichmentReadyMail(self.user, self.enrichment_request)


class EnrichmentErrorNotification(MessageNotification):
    """Notification when an enrichment request fails."""

    enrichment_request: models.ForeignKey = models.ForeignKey(
        "intelio.EnrichmentRequest",
        on_delete=models.CASCADE,
        related_name="error_notifications",
        help_text="Enrichment request that failed.",
    )
    error_message: models.TextField = models.TextField(
        blank=True, null=True, help_text="Error details from the enrichment failure."
    )

    @property
    def get_mail(self):
        """Return EnrichmentErrorMail for the failed enrichment."""
        return EnrichmentErrorMail(self.user, self.enrichment_request, self.error_message)
