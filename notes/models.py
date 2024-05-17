from django.db import models
from entities.models import Entity


class Note(models.Model):
    content = models.CharField()
    timestamp = models.DateTimeField(auto_now_add=True)
    entities = models.ManyToManyField(Entity)
