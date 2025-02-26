from django.db import models
from django_lifecycle import AFTER_CREATE, LifecycleModelMixin, hook
from mail.models import NewUserNotificationMail
from user.models import CradleUser
from entries.models import Entry
from model_utils.managers import InheritanceManager
import uuid


class MessageNotification(models.Model, LifecycleModelMixin):
    id: models.UUIDField = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False
    )
    message: models.CharField = models.CharField()
    user: models.ForeignKey = models.ForeignKey(CradleUser, on_delete=models.CASCADE)
    timestamp: models.DateTimeField = models.DateTimeField(auto_now_add=True)
    is_unread: models.BooleanField = models.BooleanField(default=True)
    is_marked_unread: models.BooleanField = models.BooleanField(default=False)

    objects: InheritanceManager = InheritanceManager()

    @property
    def get_mail(self):
        raise NotImplementedError()

    @hook(AFTER_CREATE)
    def send_mail(self, *args, **kwargs):
        self.get_mail.dispatch()


class AccessRequestNotification(MessageNotification):
    requesting_user: models.ForeignKey = models.ForeignKey(
        CradleUser, on_delete=models.CASCADE
    )
    entity: models.ForeignKey = models.ForeignKey(Entry, on_delete=models.CASCADE)

    @property
    def get_mail(self):
        return AccessRequestNotification(self.user, self.requesting_user, self.entity)


class NewUserNotification(MessageNotification):
    new_user: models.ForeignKey = models.ForeignKey(
        CradleUser, on_delete=models.CASCADE
    )

    @property
    def get_mail(self):
        return NewUserNotificationMail(self.user, self.new_user)


class ReportRenderNotification(MessageNotification):
    published_report = models.ForeignKey(
        "publish.PublishedReport",
        on_delete=models.CASCADE,
        related_name="render_notifications",
    )

    @property
    def get_mail(self):
        # Return an instance of ReportReadyMail for sending the "report ready" email.
        from mail.models import ReportReadyMail

        return ReportReadyMail(self.user, self.published_report)


class ReportProcessingErrorNotification(MessageNotification):
    published_report = models.ForeignKey(
        "publish.PublishedReport",
        on_delete=models.CASCADE,
        related_name="processing_error_notifications",
    )
    error_message = models.TextField(blank=True, null=True)

    @property
    def get_mail(self):
        # Return an instance of ReportErrorMail for sending the error email.
        from mail.models import ReportErrorMail

        return ReportErrorMail(self.user, self.published_report, self.error_message)
