from django.db import models
from django.utils.translation import gettext_lazy as _


class DigestStatus(models.TextChoices):
    WORKING = "working", "Working"
    DONE = "done", "Done"
    ERROR = "error", "Error"


class EnrichmentStatus(models.TextChoices):
    WAITING = "waiting", "Waiting"
    WORKING = "working", "Working"
    WARNING = "warning", "Warning"
    DONE = "done", "Done"
    ERROR = "error", "Error"
