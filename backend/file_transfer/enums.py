"""Enums for the file transfer app."""

from django.db import models
from django.utils.translation import gettext_lazy as _


class FileProcessOutcome(models.TextChoices):
    """What processing one file did; process_file_task returns it so reprocessing all files can report a summary."""

    PROCESSED = "processed", _("processed")
    FAILED = "failed", _("failed")
    SKIPPED = "skipped", _("skipped")
