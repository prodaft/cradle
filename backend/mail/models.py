import abc
from typing import Dict, Any, Optional
from django.template.loader import render_to_string
from django.conf import settings

from .tasks import send_email_task


class Mail(abc.ABC):
    def __init__(self, subject: str) -> None:
        self.subject = subject

    @property
    def body(self) -> str:
        raise NotImplementedError()

    @property
    def mimetype(self) -> str:
        raise NotImplementedError()

    @property
    def from_email(self) -> str:
        return settings.DEFAULT_FROM_EMAIL

    def dispatch(self):
        raise NotImplementedError()

    def _dispatch_celery(self, recipient: str):
        send_email_task.delay(
            subject=self.subject,
            body=self.body,
            recipient=recipient,
            from_email=self.from_email,
            mimetype=self.mimetype,
        )


class TemplatedMail(Mail):
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
    def __init__(self, user) -> None:
        self.user = user
        reset_url = (
            f"{settings.FRONTEND_URL}/#reset-password?token={user.password_reset_token}"
        )
        params = {
            "user": user,
            "reset_url": reset_url,
        }
        super().__init__(
            subject="CRADLE Password Reset",
            template_name="mail/password_reset.html",
            params=params,
        )

    def dispatch(self):
        self._dispatch_celery(self.user.email)


class ConfirmationMail(TemplatedMail):
    def __init__(self, user) -> None:
        self.user = user
        confirm_url = f"{settings.FRONTEND_URL}/#confirm-email?token={user.email_confirmation_token}"
        params = {
            "user": user,
            "confirmation_url": confirm_url,
        }
        super().__init__(
            subject="CRADLE Email Confirm",
            template_name="mail/email_confirm.html",
            params=params,
        )

    def dispatch(self):
        self._dispatch_celery(self.user.email)


class AccessRequestMail(TemplatedMail):
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

    def dispatch(self):
        self._dispatch_celery(self.recipient.email)


class AccessGrantedMail(TemplatedMail):
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

    def dispatch(self):
        self._dispatch_celery(self.recipient.email)


class NewUserNotificationMail(TemplatedMail):
    def __init__(self, user, new_user) -> None:
        self.user = user
        activate_url = f"{settings.FRONTEND_URL}/#account/{new_user.id}"
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

    def dispatch(self):
        self._dispatch_celery(self.user.email)


class ReportReadyMail(TemplatedMail):
    def __init__(self, user, published_report) -> None:
        self.user = user
        self.published_report = published_report
        params = {
            "user": user,
            "report": published_report,
            "report_location": f"{settings.FRONTEND_URL}/#reports/{published_report.id}",
        }
        super().__init__(
            subject="CRADLE - Your Report is Ready",
            template_name="mail/report_ready.html",
            params=params,
        )

    def dispatch(self):
        self._dispatch_celery(self.user.email)


class ReportErrorMail(TemplatedMail):
    def __init__(self, user, published_report, error_message=None) -> None:
        self.user = user
        self.published_report = published_report
        self.error_message = error_message
        params = {
            "user": user,
            "report": published_report,
            "error_message": error_message
            or "Unknown error occurred during report processing.",
        }
        super().__init__(
            subject="CRADLE - Error Processing Your Report",
            template_name="mail/report_error.html",
            params=params,
        )

    def dispatch(self):
        self._dispatch_celery(self.user.email)
