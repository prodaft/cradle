"""Enums for the notes app."""

from django.db import models
from django.utils.translation import gettext_lazy as _


class NoteStatus(models.TextChoices):
    """Processing status of a note."""

    HEALTHY = "healthy", _("Healthy")
    PROCESSING = "processing", _("Processing")
    WARNING = "warning", _("Warning")
    INVALID = "invalid", _("Invalid")


NoteListStatus = models.TextChoices(
    "NoteListStatus",
    [
        ("FLEETING", ("fleeting", _("Fleeting"))),
        ("PUBLISHED", ("published", _("Published"))),
        *((status.name, (status.value, status.label)) for status in NoteStatus),
    ],
)
