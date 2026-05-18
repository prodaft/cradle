from django.db import models

from ..base import ClassMapping


class CatalystMapping(ClassMapping):
    """Maps Catalyst types to CRADLE entry classes for publish/ingest workflows."""

    display_name = "catalyst"

    type = models.CharField(max_length=255, help_text="Catalyst type identifier")
    field = models.CharField(max_length=255, help_text="Catalyst field name")
    level = models.CharField(max_length=255, blank=True, null=True, help_text="Optional level")
    link_type = models.CharField(max_length=255, help_text="Link type for relations")
    extras = models.CharField(max_length=255, blank=True, null=True, help_text="Optional extra data")
