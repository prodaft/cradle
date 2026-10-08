"""Enums for entry types, relation reasons, and validation formats."""

from django.db import models
from django.utils.translation import gettext_lazy as _


class EntryType(models.TextChoices):
    """Top-level entry classification."""

    ENTITY = "entity", _("Entity")
    ARTIFACT = "artifact", _("Artifact")


class RelationReason(models.TextChoices):
    """Reason for a relation between two entries."""

    DIGEST = "digest", _("Digest")
    ENRICHMENT = "enrichment", _("Enrichment")
    CONTAINS = "contains", _("Contains")
    ALIAS = "alias", _("Alias")
    ENCOUNTER = "encounter", _("Encounter")
    NOTE = "note", _("Note")


class EntryTypeFormat(models.TextChoices):
    """Validation format for artifact entry classes."""

    REGEX = "regex", _("Regex")
    OPTIONS = "options", _("Options")
