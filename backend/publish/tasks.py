import logging

from celery import shared_task

from notifications.models import (
    ReportProcessingErrorNotification,
    ReportRenderNotification,
)
from publish.models import PublishedReport, ReportStatus
from publish.strategies import PUBLISH_STRATEGIES

# Configure logger for this module.
logger = logging.getLogger(__name__)


@shared_task
def generate_report(report_id):
    try:
        report = PublishedReport.objects.get(id=report_id)
    except PublishedReport.DoesNotExist:
        logger.error("Report with id %s does not exist.", report_id)
        return

    user = report.user

    try:
        publisher_factory = PUBLISH_STRATEGIES.get(report.strategy)
        if publisher_factory is None:
            raise ValueError("Strategy not found.")

        publisher = publisher_factory(report.anonymized)
        result = publisher.create_report(report)

        if not result:
            ReportProcessingErrorNotification.objects.create(
                user=user,
                message=f"There was an error processing your report: {report.title}",
                published_report=report,
                error_message=report.error_message,
            )
            report.status = ReportStatus.ERROR
            report.save()
            return

        report.status = ReportStatus.DONE
        report.save()

        ReportRenderNotification.objects.create(
            user=user,
            message=f'Your report "{report.title}" is now ready.',
            published_report=report,
        )
    except Exception as e:
        report.status = ReportStatus.ERROR
        report.error_message = "An unknown error occurred when generating report, please contact your admin."
        report.save()

        ReportProcessingErrorNotification.objects.create(
            user=user,
            message=f"There was an error processing your report: {report.title}",
            published_report=report,
            error_message=report.error_message,
        )
        raise e


@shared_task
def edit_report(report_id):
    try:
        report = PublishedReport.objects.get(id=report_id)
    except PublishedReport.DoesNotExist:
        logger.error("Report with id %s does not exist.", report_id)
        return

    # user = report.user
    notes = list(report.notes.all())
    title = report.title

    try:
        publisher_factory = PUBLISH_STRATEGIES.get(report.strategy)
        if publisher_factory is None:
            raise ValueError("Strategy not found.")

        publisher = publisher_factory(report.anonymized)
        result = publisher.edit_report(report)

        if not result:
            report.status = ReportStatus.ERROR
            report.save()
            return

        report.title = title
        report.notes.set(notes)
        report.status = ReportStatus.DONE
        report.save()

    except Exception as e:
        report.status = ReportStatus.ERROR
        report.error_message = (
            "An unknown error occurred when editing report, please contact your admin."
        )
        report.save()
        raise e
