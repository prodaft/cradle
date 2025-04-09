from django.db import models
from django.utils.translation import gettext_lazy as _


class EntryType(models.TextChoices):
    ENTITY = "entity", _("Entity")
    ARTIFACT = "artifact", _("Artifact")


class RelationReason(models.TextChoices):
    DIGEST = "digest", _("Digest")
    ENRICHMENT = "enrichment", _("Enrichment")
    CONTAINS = "contains", _("Contains")
    ALIAS = "alias", _("Alias")
    ENCOUNTER = "encounter", _("Encounter")
    NOTE = "note", _("Note")
