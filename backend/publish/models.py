"""Published report models for exporting notes to external systems and file formats."""

import uuid

from django.db import models

from file_transfer.storage import ReportStorage
from logs.models import EventLog, LoggableModelMixin
from notes.models import Note
from user.models import CradleUser

from .managers import PublishedReportManager


def report_upload_path(instance: "PublishedReport", _filename: str) -> str:
    """Return S3 object key: {report_id}.{strategy}, e.g. abc123.html."""
    return f"{instance.id}.{(instance.strategy or '').lower()}"


class UploadStrategies(models.TextChoices):
    """Strategies for uploading reports to external systems."""

    CATALYST = "catalyst", "Catalyst"


class DownloadStrategies(models.TextChoices):
    """Strategies for exporting reports in different formats."""

    HTML = "html", "HTML"
    PLAINTEXT = "plain", "Plain Text"
    JSON = "json", "JSON"


class ReportStatus(models.TextChoices):
    """Publication lifecycle status."""

    WORKING = "working", "Working"
    DONE = "done", "Done"
    ERROR = "error", "Error"


class PublishedReport(models.Model, LoggableModelMixin):
    """A report published from notes, stored in S3 and optionally sent to external systems."""

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="Unique identifier for the report.",
    )
    user = models.ForeignKey(
        CradleUser,
        on_delete=models.SET_NULL,
        related_name="published_reports",
        null=True,
        help_text="User who created the report.",
    )
    title = models.CharField(
        max_length=512,
        default="Title",
        null=False,
        blank=False,
        help_text="Display title of the report.",
    )
    notes = models.ManyToManyField(
        Note,
        related_name="published_reports",
        help_text="Notes included in this report.",
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="When the report was created.",
    )
    strategy = models.CharField(
        max_length=255,
        choices=UploadStrategies.choices + DownloadStrategies.choices,
        help_text="Upload or download format strategy.",
    )
    anonymized = models.BooleanField(
        default=False,
        help_text="Whether the report content has been anonymized.",
    )
    extra_data = models.JSONField(
        null=True,
        blank=True,
        help_text="Additional strategy-specific metadata.",
    )

    status = models.CharField(
        max_length=10,
        choices=ReportStatus.choices,
        default=ReportStatus.WORKING,
        help_text="Current publication status.",
    )

    error_message = models.TextField(
        blank=True,
        null=True,
        help_text="Error details when status is error.",
    )

    file: models.FileField = models.FileField(
        upload_to=report_upload_path,
        storage=ReportStorage,
        null=True,
        blank=True,
        help_text="Report file stored in S3.",
    )

    objects = PublishedReportManager()

    external_ref = models.CharField(
        max_length=1024,
        null=True,
        help_text="Reference ID in external system (e.g. Catalyst).",
    )

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "published report"
        verbose_name_plural = "published reports"

    def __str__(self) -> str:
        return f"{self.title} ({self.get_status_display()})"

    def propagate_from(self, log: EventLog) -> None:
        """Propagate log context; no-op for PublishedReport (reports do not create event logs)."""
        pass
