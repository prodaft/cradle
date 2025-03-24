import logging
from io import BytesIO

import requests
from celery import shared_task

from entries.enums import EntryType
from entries.models import Entry, EntryClass
from file_transfer.models import FileReference
from file_transfer.utils import MinioClient
from notes.models import Note
from notes.processor.task_scheduler import TaskScheduler
from notifications.models import (
    ReportProcessingErrorNotification,
    ReportRenderNotification,
)
from publish.models import PublishedReport, ReportStatus
from publish.strategies import PUBLISH_STRATEGIES
from user.models import CradleUser

# Configure logger for this module.
logger = logging.getLogger(__name__)


@shared_task
def generate_report(report_id):
    try:
        report = PublishedReport.objects.get(id=report_id)
    except PublishedReport.DoesNotExist:
        logger.error("Report with id %s does not exist.", report_id)
        return

    notes = list(report.notes.all())
    user = report.user

    try:
        publisher_factory = PUBLISH_STRATEGIES.get(report.strategy)
        if publisher_factory is None:
            raise ValueError("Strategy not found.")

        publisher = publisher_factory(report.anonymized)
        result = publisher.create_report(report.title, notes, user)

        if not result.success:
            raise Exception(result.error)

        report.report_location = result.data
        report.status = ReportStatus.DONE
        report.save()

        ReportRenderNotification.objects.create(
            user=user,
            message=f'Your report "{report.title}" is now ready.',
            published_report=report,
        )
    except Exception as e:
        logger.exception("Error generating report (id: %s): %s", report_id, e)
        report.status = ReportStatus.ERROR
        report.error_message = str(e)
        report.save()

        ReportProcessingErrorNotification.objects.create(
            user=user,
            message=f"There was an error processing your report: {report.title}",
            published_report=report,
            error_message=report.error_message,
        )


@shared_task
def edit_report(report_id):
    try:
        report = PublishedReport.objects.get(id=report_id)
    except PublishedReport.DoesNotExist:
        logger.error("Report with id %s does not exist.", report_id)
        return

    user = report.user
    notes = list(report.notes.all())
    title = report.title

    try:
        publisher_factory = PUBLISH_STRATEGIES.get(report.strategy)
        if publisher_factory is None:
            raise ValueError("Strategy not found.")

        publisher = publisher_factory(report.anonymized)
        result = publisher.edit_report(title, report.report_location, notes, user)

        if not result.success:
            raise Exception(result.error)

        report.title = title
        report.report_location = result.data
        report.notes.set(notes)
        report.status = ReportStatus.DONE
        report.error_message = ""
        report.save()
    except Exception as e:
        logger.exception("Error editing report (id: %s): %s", report_id, e)
        report.status = ReportStatus.ERROR
        report.error_message = str(e)
        report.save()
