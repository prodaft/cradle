from django.db import models
from django.utils.translation import gettext_lazy as _
from typing import Type, cast
from django.db.models.enums import ChoicesMeta

class EntryType(models.TextChoices):
    ENTITY = "entity", _("Entity")
    ARTIFACT = "artifact", _("Artifact")
