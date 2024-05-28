from django.db import models
from entities.models import Entity
from .managers import NoteManager


class Note(models.Model):
    content: models.CharField = models.CharField()
    publishable: models.BooleanField = models.BooleanField(default=False)
    timestamp: models.DateTimeField = models.DateTimeField(auto_now_add=True)
    entities: models.ManyToManyField = models.ManyToManyField(Entity)

    objects = NoteManager()
