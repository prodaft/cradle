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


class RelinkOutcome(models.TextChoices):
    """What relinking one note did; relink_note_task returns it so relinking all notes can report a summary."""

    RELINKED = "relinked", _("re-linked")
    INVALID = "invalid", _("invalid")
    FAILED = "failed", _("failed")
    SKIPPED = "skipped", _("skipped")
