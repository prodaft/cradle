"""Email abstraction layer for CRADLE.

Provides base classes and concrete implementations for transactional emails
(password reset, confirmations, access requests, reports, enrichments).
"""

import abc
from typing import Any, Dict, Optional

from django.conf import settings
from django.template.loader import render_to_string

from .tasks import send_email_task


class Mail(abc.ABC):
    """Abstract base for all email types. Subclasses define body, mimetype, and dispatch."""

    def __init__(self, subject: str) -> None:
        self.subject = subject

    @property
    @abc.abstractmethod
    def body(self) -> str: ...

    @property
    @abc.abstractmethod
    def mimetype(self) -> str: ...

    @property
    def from_email(self) -> str:
        """Sender address from settings."""
        return settings.DEFAULT_FROM_EMAIL

    @abc.abstractmethod
    def dispatch(self) -> None: ...

    def _dispatch_celery(self, recipient: str) -> None:
        """Queue email via Celery task."""
        send_email_task.delay(
            subject=self.subject,
            body=self.body,
            recipient=recipient,
            from_email=self.from_email,
            mimetype=self.mimetype,
        )


class TemplatedMail(Mail):
    """Mail whose body is rendered from a Django template."""

    def __init__(
        self,
        subject: str,
        template_name: str,
        params: Optional[Dict[str, Any]] = None,
        mimetype: str = "text/html",
    ) -> None:
        super().__init__(subject)
        self._template_name = template_name
        self._params = params or {}
        self._mimetype = mimetype

    @property
    def body(self) -> str:
        return render_to_string(self._template_name, self._params)

    @property
    def mimetype(self) -> str:
        return self._mimetype


class ResetPasswordMail(TemplatedMail):
    """Password reset link email for users who forgot their password."""

    def __init__(self, user) -> None:
        self.user = user
        reset_url = f"{settings.FRONTEND_URL}/reset-password?token={user.password_reset_token}"
        params = {
            "user": user,
            "reset_url": reset_url,
        }
        super().__init__(
            subject="CRADLE Password Reset",
            template_name="mail/password_reset.html",
            params=params,
        )

    def dispatch(self) -> None:
        self._dispatch_celery(self.user.email)


class ConfirmationMail(TemplatedMail):
    """Email verification link for new user registration."""

    def __init__(self, user) -> None:
        self.user = user
        confirm_url = f"{settings.FRONTEND_URL}/confirm-email?token={user.email_confirmation_token}"
        params = {
            "user": user,
            "confirmation_url": confirm_url,
        }
        super().__init__(
            subject="CRADLE Email Confirm",
            template_name="mail/email_confirm.html",
            params=params,
        )

    def dispatch(self) -> None:
        self._dispatch_celery(self.user.email)


class AccessRequestMail(TemplatedMail):
    """Notifies an entity owner that someone requested access to an entry."""

    def __init__(self, user, requester, entry) -> None:
        self.recipient = user
        self.requester = requester
        self.entry = entry
        params = {
            "recipient": self.recipient,
            "requester": self.requester,
            "entry": self.entry,
            "frontend_url": settings.FRONTEND_URL,
        }
        super().__init__(
            subject="CRADLE Case Access Request",
            template_name="mail/access_request.html",
            params=params,
        )

    def dispatch(self) -> None:
        self._dispatch_celery(self.recipient.email)


class AccessGrantedMail(TemplatedMail):
    """Notifies a requester that their access request was approved."""

    def __init__(self, user, entry) -> None:
        self.recipient = user
        self.entry = entry
        params = {
            "recipient": self.recipient,
            "entry": self.entry,
            "frontend_url": settings.FRONTEND_URL,
        }
        super().__init__(
            subject="CRADLE Access Granted",
            template_name="mail/access_granted.html",
            params=params,
        )

    def dispatch(self) -> None:
        self._dispatch_celery(self.recipient.email)


class NewUserNotificationMail(TemplatedMail):
    """Notifies admins when a new user registers and awaits activation."""

    def __init__(self, user, new_user) -> None:
        self.user = user
        activate_url = f"{settings.FRONTEND_URL}/account/{new_user.id}"
        params = {
            "admin": user,
            "new_user": new_user,
            "activate_url": activate_url,
        }
        super().__init__(
            subject="CRADLE - New User Awaiting Activation",
            template_name="mail/new_user_notification.html",
            params=params,
        )

    def dispatch(self) -> None:
        self._dispatch_celery(self.user.email)


class ReportReadyMail(TemplatedMail):
    """Notifies a user when their published report is ready for download."""

    def __init__(self, user, published_report) -> None:
        self.user = user
        self.published_report = published_report
        params = {
            "user": user,
            "report": published_report,
            "report_location": f"{settings.FRONTEND_URL}/reports/{published_report.id}",
        }
        super().__init__(
            subject="CRADLE - Your Report is Ready",
            template_name="mail/report_ready.html",
            params=params,
        )

    def dispatch(self) -> None:
        self._dispatch_celery(self.user.email)


class ReportErrorMail(TemplatedMail):
    """Notifies a user when report publication fails."""

    def __init__(self, user, published_report, error_message=None) -> None:
        self.user = user
        self.published_report = published_report
        params = {
            "user": user,
            "report": published_report,
            "error_message": error_message or "Unknown error occurred during report processing.",
        }
        super().__init__(
            subject="CRADLE - Error Processing Your Report",
            template_name="mail/report_error.html",
            params=params,
        )

    def dispatch(self) -> None:
        self._dispatch_celery(self.user.email)


class EnrichmentReadyMail(TemplatedMail):
    """Notifies a user when their enrichment request has completed."""

    def __init__(self, user, enrichment_request) -> None:
        self.user = user
        self.enrichment_request = enrichment_request
        params = {
            "user": user,
            "enrichment": enrichment_request,
            "enrichment_location": f"{settings.FRONTEND_URL}/enrichments/{enrichment_request.id}",
        }
        super().__init__(
            subject="CRADLE - Your Enrichment is Complete",
            template_name="mail/enrichment_ready.html",
            params=params,
        )

    def dispatch(self) -> None:
        self._dispatch_celery(self.user.email)


class EnrichmentErrorMail(TemplatedMail):
    """Notifies a user when enrichment processing fails."""

    def __init__(self, user, enrichment_request, error_message=None) -> None:
        self.user = user
        self.enrichment_request = enrichment_request
        params = {
            "user": user,
            "enrichment": enrichment_request,
            "error_message": error_message or "Unknown error occurred during enrichment processing.",
        }
        super().__init__(
            subject="CRADLE - Error Processing Your Enrichment",
            template_name="mail/enrichment_error.html",
            params=params,
        )

    def dispatch(self) -> None:
        self._dispatch_celery(self.user.email)
