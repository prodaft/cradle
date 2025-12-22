from django.db import models


class DigestStatus(models.TextChoices):
    WORKING = "working", "Working"
    WARNING = "warning", "Warning"
    DONE = "done", "Done"
    ERROR = "error", "Error"


class EnrichmentStatus(models.TextChoices):
    WAITING = "waiting", "Waiting"
    WORKING = "working", "Working"
    WARNING = "warning", "Warning"
    DONE = "done", "Done"
    ERROR = "error", "Error"
