from django.db import models
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


class AccessRequestNotification(MessageNotification):
    requesting_user: models.ForeignKey = models.ForeignKey(
        CradleUser, on_delete=models.CASCADE
    )
    entity: models.ForeignKey = models.ForeignKey(Entry, on_delete=models.CASCADE)
