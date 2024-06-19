from django.db import models

from user.models import CradleUser
import uuid


class FleetingNote(models.Model):
    id: models.UUIDField = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False
    )
    content: models.CharField = models.CharField()
    last_edited: models.DateTimeField = models.DateTimeField(auto_now=True)
    user: models.ForeignKey = models.ForeignKey(CradleUser, on_delete=models.CASCADE)
