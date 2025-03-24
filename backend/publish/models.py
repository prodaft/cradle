import uuid
from django.db import models
from file_transfer.models import FileReference
from logs.models import LoggableModelMixin
from notes.models import Note
from user.models import CradleUser
from .managers import PublishedReportManager


# Existing strategy choices.
class UploadStrategies(models.TextChoices):
    CATALYST = "catalyst", "Catalyst"


class DownloadStrategies(models.TextChoices):
    HTML = "html", "HTML"
    PLAINTEXT = "plain", "Plain Text"
    JSON = "json", "JSON"


class ReportStatus(models.TextChoices):
    WORKING = "working", "Working"
    DONE = "done", "Done"
    ERROR = "error", "Error"


class PublishedReport(models.Model, LoggableModelMixin):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        CradleUser,
        on_delete=models.SET_NULL,
        related_name="published_reports",
        null=True,
    )
    title = models.CharField(max_length=512, default="Title", null=False, blank=False)
    notes = models.ManyToManyField(Note, related_name="published_reports")
    created_at = models.DateTimeField(auto_now_add=True)
    strategy = models.CharField(
        max_length=255, choices=UploadStrategies.choices + DownloadStrategies.choices
    )
    anonymized = models.BooleanField(default=False)
    report_location = models.CharField(max_length=1024, null=True)
    extra_data = models.JSONField(null=True, blank=True)

    status = models.CharField(
        max_length=10,
        choices=ReportStatus.choices,
        default=ReportStatus.WORKING,
    )

    error_message = models.TextField(blank=True, null=True)

    objects = PublishedReportManager()

    remote_url = models.CharField(max_length=1024, null=True)

    class Meta:
        ordering = ["-created_at"]

    #     ## XOR one of remote url or report file can be set
    #     constraints = [
    #         models.CheckConstraint(
    #             check=models.Q(remote_url__isnull=True) | models.Q(file__isnull=True),
    #             name="remote_url_xor_report_file_1",
    #         ),
    #         models.CheckConstraint(
    #             check=models.Q(remote_url__isnull=False) | models.Q(file__isnull=False),
    #             name="remote_url_xor_report_file_2",
    #         ),
    #     ]

    def propagate_from(self, log):
        return
