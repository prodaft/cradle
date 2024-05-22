from django.db import models
from entities.models import Entity
from user.models import CradleUser


class Note(models.Model):
    content = models.CharField()
    author = models.ForeignKey(CradleUser, on_delete=models.CASCADE, null=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    entities = models.ManyToManyField(Entity)
