from django.db import models

field_length = 200


class Case(models.Model):
    name = models.CharField(max_length=field_length)
    description = models.CharField(max_length=field_length)


class Actor(models.Model):
    name = models.CharField(max_length=field_length)
    description = models.CharField(max_length=field_length)
