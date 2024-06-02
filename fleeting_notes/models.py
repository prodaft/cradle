from django.db import models

from user.models import CradleUser


class FleetingNote(models.Model):
    content: models.CharField = models.CharField()
    last_edited: models.DateTimeField = models.DateTimeField(auto_now=True)
    user: models.ForeignKey = models.ForeignKey(CradleUser, on_delete=models.CASCADE)
