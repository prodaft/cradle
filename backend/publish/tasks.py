"""Celery tasks for asynchronous report generation.

Reports are written with ``save_fields()``, never ``save()``: a report deleted while it is generated must stay deleted.
"""

import logging

from celery import shared_task

from notifications.models import (
    ReportProcessingErrorNotification,
    ReportRenderNotification,
)

from .models import PublishedReport, ReportStatus

logger = logging.getLogger(__name__)


def _get_report(report_id):
    """Fetch report by id. Return None if not found and log the error."""
    try:
        return PublishedReport.objects.get(id=report_id)
    except PublishedReport.DoesNotExist:
        logger.error("Report with id %s does not exist.", report_id)
        return None


def _notify_error(report, action):
    """Tell the owner that ``action`` failed, unless the report was deleted meanwhile."""
    if report.user and PublishedReport.objects.filter(pk=report.pk).exists():
        ReportProcessingErrorNotification.objects.create(
            user=report.user,
            message=f"There was an error {action} your report: {report.title}",
            published_report=report,
            error_message=report.error_message,
        )


def _notify_ready(report):
    if report.user:
        ReportRenderNotification.objects.create(
            user=report.user,
            message=f'Your report "{report.title}" is now ready.',
            published_report=report,
        )


@shared_task
def generate_report(report_id):
    """Generate a published report asynchronously and notify the user when done."""
    report = _get_report(report_id)
    if report is None:
        return

    try:
        publisher = report.publisher
        if publisher is None:
            raise ValueError("Strategy not found.")
        if not publisher.create_report(report):
            _notify_error(report, "generating")
            return

        report.status = ReportStatus.DONE
        if report.save_fields("status"):
            _notify_ready(report)
    except Exception:
        logger.exception("Report generation failed for report %s.", report_id)
        report.mark_error("An unknown error occurred while generating the report. Please contact your administrator.")
        _notify_error(report, "generating")
        raise
