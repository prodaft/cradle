"""Status enums for digests and enrichment requests."""

from django.db import models


class DigestStatus(models.TextChoices):
    """Status of a digest import job."""

    WORKING = "working", "Working"
    WARNING = "warning", "Warning"
    DONE = "done", "Done"
    ERROR = "error", "Error"


class EnrichmentStatus(models.TextChoices):
    """Status of an enrichment request or individual enricher."""

    WAITING = "waiting", "Waiting"
    WORKING = "working", "Working"
    WARNING = "warning", "Warning"
    DONE = "done", "Done"
    ERROR = "error", "Error"
