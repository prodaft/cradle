from django.db import models
from django.utils.translation import gettext_lazy as _


class EntryType(models.TextChoices):
    ENTITY = "entity", _("Entity")
    ARTIFACT = "artifact", _("Artifact")


class RelationReason(models.TextChoices):
    CONTAINS = "contains", _("Contains")
    ALIAS = "alias", _("Alias")
    ENCOUNTER = "encounter", _("Encounter")
    NOTE = "note", _("Note")
