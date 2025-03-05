import json
import uuid
from io import BytesIO
from datetime import timedelta
from typing import List

import requests
from notes.models import Note
from user.models import CradleUser
from publish.strategies.base import BasePublishStrategy, PublishResult
from file_transfer.utils import MinioClient

from entries.serializers import EntryResponseSerializer, EntryClassSerializer


class JSONPublish(BasePublishStrategy):
    """
    A publishing strategy that generates a JSON report from a list of notes.
    """

    def generate_access_link(self, report_location: str, user: CradleUser) -> str:
        bucket_name = self._get_bucket_name(user)
        client = MinioClient().client
        return client.presigned_get_object(
            bucket_name,
            report_location,
            expires=timedelta(hours=1),
            response_headers={
                "Content-Disposition": f'attachment; filename="{report_location}"'
            },
        )

    def create_report(
        self, title: str, notes: List[Note], user: CradleUser
    ) -> PublishResult:
        report = self._build_report(title, notes)
        file_name = f"{uuid.uuid4()}.json"
        return self._upload_report(report, user, file_name, "upload")

    def edit_report(
        self, title: str, report_location: str, notes: List[Note], user: CradleUser
    ) -> PublishResult:
        report = self._build_report(title, notes)
        return self._upload_report(report, user, report_location, "update")

    def delete_report(self, report_location: str, user: CradleUser) -> PublishResult:
        bucket_name = self._get_bucket_name(user)
        client = MinioClient().client
        try:
            client.remove_object(bucket_name, report_location)
        except Exception as e:
            return PublishResult(
                success=False, error=f"Failed to delete JSON report: {e}"
            )
        return PublishResult(success=True, data=f"Deleted: {report_location}")

    def _get_bucket_name(self, user: CradleUser) -> str:
        return str(user.id) if user else "default_bucket"

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
                        timedelta(hours=2),
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

    def _upload_report(
        self, report_dict: dict, user: CradleUser, file_name: str, action: str
    ) -> PublishResult:
        report_json = json.dumps(report_dict)
        bucket_name = self._get_bucket_name(user)
        client = MinioClient().client
        data = BytesIO(report_json.encode("utf-8"))
        size = len(report_json)
        content_type = "application/json"

        try:
            client.put_object(
                bucket_name, file_name, data, size, content_type=content_type
            )
        except Exception as e:
            return PublishResult(
                success=False, error=f"Failed to {action} JSON report: {e}"
            )
        return PublishResult(success=True, data=file_name)
