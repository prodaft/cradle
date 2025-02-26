from celery import shared_task
from django.core.exceptions import ObjectDoesNotExist
from publish.models import PublishedReport, ReportStatus
from publish.strategies import PUBLISH_STRATEGIES
from notifications.models import ReportProcessingErrorNotification
from notifications.models import ReportRenderNotification


@shared_task
def generate_report(report_id):
    try:
        report = PublishedReport.objects.get(id=report_id)
    except ObjectDoesNotExist:
        return

    notes = list(report.notes.all())
    user = report.user

    publisher_factory = PUBLISH_STRATEGIES.get(report.strategy)
    if publisher_factory is None:
        report.status = ReportStatus.ERROR
        report.error_message = "Strategy not found."
        report.save()

        ReportProcessingErrorNotification.objects.create(
            user=user,
            message=f"There was an error processing your report: {report.title}",
            published_report=report,
            error_message=report.error_message,
        )
        return

    publisher = publisher_factory()
    result = publisher.publish(report.title, notes, user)
    if not result.success:
        report.status = ReportStatus.ERROR
        report.error_message = result.error
        report.save()

        ReportProcessingErrorNotification.objects.create(
            user=user,
            message=f"There was an error processing your report: {report.title}.",
            published_report=report,
            error_message=report.error_message,
        )
        return

    report.report_location = result.data
    report.status = ReportStatus.DONE
    report.save()

    ReportRenderNotification.objects.create(
        user=user,
        message=f'Your report "{report.title}" is now ready.',
        published_report=report,
    )
