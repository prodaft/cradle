from django.db import models

from .enums import EntityType


class CaseManager(models.Manager):
    def get_queryset(self) -> models.QuerySet:
        return super().get_queryset().filter(type=EntityType.CASE)


class ActorManager(models.Manager):
    def get_queryset(self) -> models.QuerySet:
        return super().get_queryset().filter(type=EntityType.ACTOR)


class EntryManager(models.Manager):
    def get_queryset(self) -> models.QuerySet:
        return super().get_queryset().filter(type=EntityType.ENTRY)


class MetadataManager(models.Manager):
    def get_queryset(self) -> models.QuerySet:
        return super().get_queryset().filter(type=EntityType.METADATA)
