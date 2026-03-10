"""Celery tasks for asynchronous report generation and editing."""

import logging

from celery import shared_task

from notifications.models import (
    ReportProcessingErrorNotification,
    ReportRenderNotification,
)

from .models import PublishedReport, ReportStatus
from .strategies import PUBLISH_STRATEGIES

logger = logging.getLogger(__name__)


def _get_report(report_id):
    """Fetch report by id. Return None if not found and log the error."""
    try:
        return PublishedReport.objects.get(id=report_id)
    except PublishedReport.DoesNotExist:
        logger.error("Report with id %s does not exist.", report_id)
        return None


def _get_publisher(report):
    """Return publisher for report. Raises ValueError if strategy not found."""
    factory = PUBLISH_STRATEGIES.get((report.strategy or "").lower())
    if factory is None:
        raise ValueError("Strategy not found.")
    return factory(report.anonymized)


@shared_task
def generate_report(report_id):
    """Generate a published report asynchronously and notify the user when done."""
    report = _get_report(report_id)
    if report is None:
        return

    user = report.user

    try:
        publisher = _get_publisher(report)
        result = publisher.create_report(report)

        if not result:
            if user:
                ReportProcessingErrorNotification.objects.create(
                    user=user,
                    message=f"There was an error generating your report: {report.title}",
                    published_report=report,
                    error_message=report.error_message,
                )
            return

        report.status = ReportStatus.DONE
        report.save()

        if user:
            ReportRenderNotification.objects.create(
                user=user,
                message=f'Your report "{report.title}" is now ready.',
                published_report=report,
            )
    except Exception:
        logger.exception("Report generation failed for report %s.", report_id)
        report.status = ReportStatus.ERROR
        report.error_message = "An unknown error occurred when generating report, please contact your admin."
        report.save()

        if user:
            ReportProcessingErrorNotification.objects.create(
                user=user,
                message=f"There was an error generating your report: {report.title}",
                published_report=report,
                error_message=report.error_message,
            )
        raise


@shared_task
def edit_report(report_id):
    """Edit a published report asynchronously and notify the user when done. Not yet wired to any view."""
    report = _get_report(report_id)
    if report is None:
        return

    user = report.user
    notes = list(report.notes.all())
    title = report.title

    try:
        publisher = _get_publisher(report)
        result = publisher.edit_report(report)

        if not result:
            if user:
                ReportProcessingErrorNotification.objects.create(
                    user=user,
                    message=f"There was an error editing your report: {report.title}",
                    published_report=report,
                    error_message=report.error_message,
                )
            return

        report.title = title
        report.notes.set(notes)
        report.status = ReportStatus.DONE
        report.save()

        if user:
            ReportRenderNotification.objects.create(
                user=user,
                message=f'Your report "{report.title}" is now ready.',
                published_report=report,
            )
    except Exception:
        logger.exception("Report edit failed for report %s.", report_id)
        report.status = ReportStatus.ERROR
        report.error_message = "An unknown error occurred when editing report, please contact your admin."
        report.save()

        if user:
            ReportProcessingErrorNotification.objects.create(
                user=user,
                message=f"There was an error editing your report: {report.title}",
                published_report=report,
                error_message=report.error_message,
            )
        raise
