import json
from io import BytesIO
from datetime import timedelta
from typing import List

from file_transfer.models import FileReference
from notes.models import Note
from publish.models import PublishedReport, ReportStatus
from publish.strategies.base import BasePublishStrategy
from file_transfer.utils import MinioClient

from entries.serializers import EntryResponseSerializer, EntryClassSerializer


class JSONPublish(BasePublishStrategy):
    """
    A publishing strategy that generates a JSON report from a list of notes.
    """

    def create_report(self, report: PublishedReport) -> bool:
        content = self._build_report(report.title, report.notes.all())
        return self._upload_report(content, report)

    def edit_report(self, report: PublishedReport) -> bool:
        content = self._build_report(report.title, report.notes.all())
        return self._upload_report(content, report)

    def delete_report(self, report: PublishedReport) -> bool:
        bucket_name = str(report.user.id)
        client = MinioClient().client
        try:
            client.remove_object(bucket_name, f"{report.id}.json")
        except Exception:
            report.error_message = "Failed to delete JSON report."
            report.status = ReportStatus.ERROR
            report.save()
            return False

        return True

    def _build_report(self, title: str, notes: List[Note]) -> dict:
        report = {
            "title": title,
            "notes": [],
            "entries": [],
            "entry_classes": [],
        }

        linked_entries_set = set()
        for note in notes:
            entries = note.entries
            files = note.files
            note = self._anonymize_note(note)

            note_data = {
                "content": note.content,
                "file_urls": {},
            }
            for entry in entries.all():
                linked_entries_set.add(self._anonymize_entry(entry))

            for file_ref in files.all():
                try:
                    url = MinioClient().create_presigned_get(
                        file_ref.bucket_name,
                        file_ref.minio_file_name,
                        timedelta(days=7),
                    )
                    note_data["file_urls"][file_ref.minio_file_name] = url
                except Exception:
                    continue

            report["notes"].append(note_data)

        entries_data = EntryResponseSerializer(linked_entries_set, many=True).data
        report["entries"] = entries_data

        linked_entry_classes = {entry.entry_class for entry in linked_entries_set}
        entry_classes_data = EntryClassSerializer(linked_entry_classes, many=True).data
        report["entry_classes"] = entry_classes_data

        return report

    def _upload_report(self, content: dict, report: PublishedReport) -> bool:
        report_json = json.dumps(content)
        bucket_name = str(report.user.id)
        client = MinioClient().client
        data = BytesIO(report_json.encode("utf-8"))
        size = len(report_json)
        content_type = "application/json"
        file_name = f"{report.id}.json"

        try:
            client.put_object(
                bucket_name, file_name, data, size, content_type=content_type
            )
            FileReference.objects.filter(report=report).delete()
            FileReference.objects.create(
                minio_file_name=file_name,
                file_name=file_name,
                bucket_name=bucket_name,
                report=report,
            )
        except Exception:
            report.error_message = "Failed to upload JSON report."
            report.status = ReportStatus.ERROR
            report.save()
            return False

        return True
