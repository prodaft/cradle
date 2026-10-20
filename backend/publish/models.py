"""Published report models for exporting notes to file formats."""

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


class DownloadStrategies(models.TextChoices):
    """Strategies for exporting reports in different formats."""

    HTML = "html", "HTML"
    PLAINTEXT = "plain", "Plain Text"
    JSON = "json", "JSON"
    PDF = "pdf", "PDF"


class TrafficLightProtocol(models.TextChoices):
    """FIRST TLP 2.0 sharing labels printed on HTML and PDF reports."""

    CLEAR = "clear", "TLP:CLEAR"
    GREEN = "green", "TLP:GREEN"
    AMBER = "amber", "TLP:AMBER"
    AMBER_STRICT = "amber+strict", "TLP:AMBER+STRICT"
    RED = "red", "TLP:RED"


class ReportStatus(models.TextChoices):
    """Publication lifecycle status."""

    WORKING = "working", "Working"
    DONE = "done", "Done"
    ERROR = "error", "Error"


class PublishedReport(models.Model, LoggableModelMixin):
    """A report published from notes and stored in S3."""

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
        choices=DownloadStrategies.choices,
        help_text="Export format strategy.",
    )
    anonymized = models.BooleanField(
        default=False,
        help_text="Whether the report content has been anonymized.",
    )
    tlp = models.CharField(
        max_length=16,
        choices=TrafficLightProtocol.choices,
        default=TrafficLightProtocol.CLEAR,
        help_text="TLP sharing label shown on the report.",
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

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "published report"
        verbose_name_plural = "published reports"

    def __str__(self) -> str:
        return f"{self.title} ({self.get_status_display()})"

    @property
    def publisher(self):
        """The publish strategy for this report's format and anonymization, or None if the format is unknown."""
        from .strategies import PUBLISH_STRATEGIES  # the strategies import this module

        factory = PUBLISH_STRATEGIES.get((self.strategy or "").lower())
        return factory(self.anonymized) if factory else None

    def save_fields(self, *fields: str) -> bool:
        """Write only ``fields`` and return whether the report still exists.

        Background generation uses this instead of ``save()`` so a report deleted meanwhile is not re-inserted.
        """
        values = {f: getattr(self, f) for f in fields}
        if "file" in values:
            values["file"] = self.file.name
        return PublishedReport.objects.filter(pk=self.pk).update(**values) > 0

    def mark_error(self, message: str) -> bool:
        """Set the error status and message; return whether the report still exists."""
        self.status = ReportStatus.ERROR
        self.error_message = message
        return self.save_fields("status", "error_message")

    def propagate_from(self, log: EventLog) -> None:
        """Propagate log context; no-op for PublishedReport (reports do not create event logs)."""
        pass
