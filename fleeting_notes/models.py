from django.db import models

from user.models import CradleUser


class FleetingNote(models.Model):
    content: models.CharField = models.CharField()
    last_updated: models.DateTimeField = models.DateTimeField(auto_now=True)
    user = models.ForeignKey(CradleUser, on_delete=models.CASCADE, to_field="id")
