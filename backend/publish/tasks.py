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


@shared_task
def download_file_for_note(note_id, file_identifier, file_url, bucket_name):
    """
    Downloads a file from the given URL, stores it in Minio, and attaches
    the resulting FileReference to the Note with the provided note_id.
    """
    try:
        note = Note.objects.get(id=note_id)
    except Note.DoesNotExist:
        logger.error("Note with id %s does not exist.", note_id)
        return

    try:
        client = MinioClient().client
        r = requests.get(file_url, timeout=10)
        r.raise_for_status()  # Raise an HTTPError for bad responses

        file_data = r.content
        data_stream = BytesIO(file_data)
        size = len(file_data)
        content_type = r.headers.get("Content-Type", "application/octet-stream")

        client.put_object(
            bucket_name,
            file_identifier,
            data_stream,
            size,
            content_type=content_type,
        )
        fr = FileReference.objects.create(
            minio_file_name=file_identifier,
            file_name=file_identifier,
            bucket_name=bucket_name,
        )
        note.files.add(fr)
        note.save()
    except Exception as e:
        logger.exception(
            "Failed to download or process file for note (id: %s). URL: %s Error: %s",
            note_id,
            file_url,
            e,
        )
        # Optionally, notify the user or perform retries here.


@shared_task
def import_json_report(report_data, user_id, report_id):
    try:
        user = CradleUser.objects.get(id=user_id)
        report = PublishedReport.objects.get(id=report_id)
    except (CradleUser.DoesNotExist, PublishedReport.DoesNotExist):
        logger.error(
            "User or report not found: user_id=%s, report_id=%s", user_id, report_id
        )
        return

    try:
        # Import or create entry classes
        for eclass in report_data.get("entry_classes", []):
            if not EntryClass.objects.filter(subtype=eclass["subtype"]).exists():
                EntryClass.objects.create(**eclass)

        # Cache existing entity subtypes
        entity_subtypes = set(
            EntryClass.objects.filter(type=EntryType.ENTITY).values_list(
                "subtype", flat=True
            )
        )

        # Create new entries if needed
        for entry in report_data.get("entries", []):
            if (
                entry["subtype"] in entity_subtypes
                and not Entry.objects.filter(
                    name=entry["name"], entry_class_id=entry["subtype"]
                ).exists()
            ):
                Entry.objects.create(
                    name=entry["name"],
                    entry_class_id=entry["subtype"],
                    description=entry["description"],
                )

        created_notes = []
        bucket_name = str(user.id) if user else "default_bucket"
        files_scheduled = 0

        for note_data in report_data.get("notes", []):
            scheduler = TaskScheduler(user, content=note_data["content"])
            created_note = scheduler.run_pipeline(validate=False)

            file_urls = note_data.get("file_urls", {})
            for file_identifier, url in file_urls.items():
                download_file_for_note.delay(
                    created_note.id, file_identifier, url, bucket_name
                )
                files_scheduled += 1

            created_note.save()
            created_notes.append(created_note)

        summary = {
            "notes_imported": len(created_notes),
            "entry_classes_imported": len(report_data.get("entry_classes", [])),
            "files_scheduled": files_scheduled,
        }

        report.report_location = None
        report.extra_data = summary
        report.status = ReportStatus.DONE
        report.save()

        return summary
    except Exception as e:
        logger.exception(
            "Error importing JSON report (report_id: %s): %s", report_id, e
        )
        report.status = ReportStatus.ERROR
        report.error_message = str(e)
        report.save()
        return {"error": str(e)}
