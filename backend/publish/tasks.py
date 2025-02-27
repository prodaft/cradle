from celery import shared_task
from django.core.exceptions import ObjectDoesNotExist
from notes.models import Note
from publish.models import PublishedReport, ReportStatus
from publish.strategies import PUBLISH_STRATEGIES
from notifications.models import ReportProcessingErrorNotification
from notifications.models import ReportRenderNotification


@shared_task
def generate_report(report_id):
    report = PublishedReport.objects.get(id=report_id)

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
    result = publisher.create_report(report.title, notes, user)
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


@shared_task
def edit_report(report_id):
    report = PublishedReport.objects.get(id=report_id)

    user = report.user
    notes = list(report.notes.all())
    title = report.title

    publisher_factory = PUBLISH_STRATEGIES.get(report.strategy)
    if publisher_factory is None:
        report.status = ReportStatus.ERROR
        report.error_message = "Strategy not found."
        report.save()
        return

    publisher = publisher_factory()
    result = publisher.edit_report(title, report.report_location, notes, user)
    if not result.success:
        report.status = ReportStatus.ERROR
        report.error_message = result.error
        report.save()
        return

    report.title = title
    report.report_location = result.data
    report.notes.set(notes)
    report.status = ReportStatus.DONE
    report.error_message = ""
    report.save()
