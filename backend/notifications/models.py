"""Notification models for user-facing alerts (access, reports, enrichments)."""

import uuid

from django.db import models
from django_lifecycle import AFTER_CREATE, LifecycleModel, hook
from model_utils.managers import InheritanceManager

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
from user.models import CradleUser


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

    objects: InheritanceManager = InheritanceManager()

    @property
    def get_mail(self):
        """Return the mail instance to send, or None if no email."""
        return None

    @hook(AFTER_CREATE)
    def send_mail(self, *args, **kwargs):
        """Send email after creation if get_mail returns a mail instance."""
        if self.get_mail:
            self.get_mail.dispatch()


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
