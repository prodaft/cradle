import uuid
from django.db import models
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


class ReportMode(models.TextChoices):
    UPLOAD = "upload", "Upload"
    DOWNLOAD = "download", "Download"


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
    report_location = models.CharField(max_length=1024)

    status = models.CharField(
        max_length=10,
        choices=ReportStatus.choices,
        default=ReportStatus.WORKING,
    )

    error_message = models.TextField(blank=True, null=True)

    mode = models.CharField(
        max_length=10,
        choices=ReportMode.choices,
        blank=True,
    )

    objects = PublishedReportManager()

    def set_mode(self):
        upload_values = [choice.value for choice in UploadStrategies]
        download_values = [choice.value for choice in DownloadStrategies]
        if self.strategy in upload_values:
            self.mode = ReportMode.UPLOAD
        elif self.strategy in download_values:
            self.mode = ReportMode.DOWNLOAD

    def propagate_from(self, log):
        return
