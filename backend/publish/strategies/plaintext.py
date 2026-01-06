from io import BytesIO
from typing import List

from file_transfer.models import FileReference
from file_transfer.storage import ReportStorage
from notes.models import Note
from publish.models import PublishedReport, ReportStatus
from publish.strategies.base import BasePublishStrategy

from file_transfer.s3_utils import delete_object, put_bytes


class PlaintextPublish(BasePublishStrategy):
    """
    A publishing strategy that generates a plaintext report from a list of notes.
    """

    content_type = "text/plain"

    def create_report(self, report: PublishedReport) -> bool:
        text_content = self._build_text(report.title, report.notes.all())
        return self._upload_text(text_content, report)

    def edit_report(self, report: PublishedReport) -> bool:
        text_content = self._build_text(report.title, report.notes.all())
        return self._upload_text(text_content, report)

    def delete_report(self, report: PublishedReport) -> bool:
        bucket_name = ReportStorage.bucket_name
        key = f"{report.id}.txt"
        try:
            delete_object(bucket_name, key)
            FileReference.objects.filter(report=report).delete()
        except Exception:
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
        bucket_name = ReportStorage.bucket_name
        content_type = "text/plain"
        key = f"{report.id}.txt"

        try:
            put_bytes(
                bucket_name,
                key,
                body=text.encode("utf-8"),
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
            report.error_message = "Failed to upload plaintext report."
            report.status = ReportStatus.ERROR
            report.save()
            return False

        return True
