from django.db import models
from mail.models import NewUserNotificationMail
from user.models import CradleUser
from entries.models import Entry
from model_utils.managers import InheritanceManager
import uuid


class MessageNotification(models.Model):
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

    ## Trigger send mail action when a new notification is created
    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
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
