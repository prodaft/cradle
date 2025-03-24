import uuid
from io import BytesIO
from datetime import timedelta
from typing import List

from file_transfer.models import FileReference
from notes.models import Note
from publish.models import PublishedReport, ReportStatus
from user.models import CradleUser
from publish.strategies.base import BasePublishStrategy
from file_transfer.utils import MinioClient


class PlaintextPublish(BasePublishStrategy):
    """
    A publishing strategy that generates a plaintext report from a list of notes.
    """

    def create_report(self, report: PublishedReport) -> bool:
        text_content = self._build_text(report.title, report.notes.all())
        return self._upload_text(text_content, report)

    def edit_report(self, report: PublishedReport) -> bool:
        text_content = self._build_text(report.title, report.notes.all())
        return self._upload_text(text_content, report)

    def delete_report(self, report: PublishedReport) -> bool:
        bucket_name = str(report.user.id)
        client = MinioClient().client
        try:
            client.remove_object(bucket_name, f"{report.id}.txt")
        except Exception as e:
            report.error_message = "Failed to delete plaintext report."
            report.status = ReportStatus.ERROR
            report.save()
            return False

        return True

    def _build_text(self, title: str, notes: List[Note]) -> str:
        contents = []
        for note in notes:
            anonymized_note = self._anonymize_note(note)
            contents.append(anonymized_note.content)
        separator = "\n-----\n"
        notes_text = separator.join(contents)
        return f"{title}\n\n{notes_text}"

    def _upload_text(self, text: dict, report: PublishedReport) -> bool:
        client = MinioClient().client
        data = BytesIO(text.encode("utf-8"))
        bucket_name = str(report.user.id)
        size = len(text)
        content_type = "text/plain"
        file_name = f"{report.id}.txt"

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
        except Exception as e:
            report.error_message = "Failed to upload plaintext report."
            report.status = ReportStatus.ERROR
            report.save()
            return False

        return True
