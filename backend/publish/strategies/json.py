import json
from datetime import timedelta
from typing import List

from file_transfer.models import FileReference
from file_transfer.storage import FileTransferStorage, ReportStorage
from notes.models import Note
from publish.models import PublishedReport, ReportStatus
from publish.strategies.base import BasePublishStrategy

from entries.serializers import EntryClassSerializer, EntryPublishSerializer
from file_transfer.s3_utils import delete_object, presign_get, put_bytes


class JSONPublish(BasePublishStrategy):
    """
    A publishing strategy that generates a JSON report from a list of notes.
    """

    content_type = "application/json"

    def create_report(self, report: PublishedReport) -> bool:
        content = self._build_report(report.title, report.notes.all())
        return self._upload_report(content, report)

    def edit_report(self, report: PublishedReport) -> bool:
        content = self._build_report(report.title, report.notes.all())
        return self._upload_report(content, report)

    def delete_report(self, report: PublishedReport) -> bool:
        bucket_name = ReportStorage.bucket_name
        key = f"{report.id}.json"
        try:
            delete_object(bucket_name, key)
            FileReference.objects.filter(report=report).delete()
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
                # Backward-compatible: markdown keys may reference legacy minio_file_name,
                # while actual objects are now stored under file_ref.file.name.
                if not file_ref.file:
                    continue

                key_candidates = [file_ref.file.name]
                if file_ref.minio_file_name:
                    key_candidates.insert(0, file_ref.minio_file_name)

                try:
                    url = presign_get(
                        FileTransferStorage.bucket_name,
                        file_ref.file.name,
                        expires_in=int(timedelta(days=7).total_seconds()),
                        response_content_type="application/octet-stream",
                        response_content_disposition=f'attachment; filename="{file_ref.file_name or "file"}"',
                    )
                    for k in key_candidates:
                        note_data["file_urls"][k] = url
                except Exception:
                    continue

            report["notes"].append(note_data)

        entries_data = EntryPublishSerializer(linked_entries_set, many=True).data
        report["entries"] = entries_data

        linked_entry_classes = {entry.entry_class for entry in linked_entries_set}
        entry_classes_data = EntryClassSerializer(linked_entry_classes, many=True).data
        report["entry_classes"] = entry_classes_data

        return report

    def _upload_report(self, content: dict, report: PublishedReport) -> bool:
        report_json = json.dumps(content)
        bucket_name = ReportStorage.bucket_name
        content_type = "application/json"
        key = f"{report.id}.json"

        try:
            put_bytes(
                bucket_name,
                key,
                body=report_json.encode("utf-8"),
                content_type=content_type,
            )
            FileReference.objects.filter(report=report).delete()
            FileReference.objects.create(
                minio_file_name=key,
                file_name=key,
                bucket_name=bucket_name,
                report=report,
            )
        except Exception:
            report.error_message = "Failed to upload JSON report."
            report.status = ReportStatus.ERROR
            report.save()
            return False

        return True
