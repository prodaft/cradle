import uuid
from io import BytesIO
from datetime import timedelta
from typing import List

from notes.models import Note
from user.models import CradleUser
from publish.strategies.base import BasePublishStrategy, PublishResult
from file_transfer.utils import MinioClient


class PlaintextPublish(BasePublishStrategy):
    """
    A publishing strategy that generates a plaintext report from a list of notes.
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
        text_content = self._build_text(title, notes)
        file_name = f"{uuid.uuid4()}.txt"
        return self._upload_text(text_content, user, file_name, "upload")

    def edit_report(
        self, title: str, report_location: str, notes: List[Note], user: CradleUser
    ) -> PublishResult:
        text_content = self._build_text(title, notes)
        return self._upload_text(text_content, user, report_location, "update")

    def delete_report(self, report_location: str, user: CradleUser) -> PublishResult:
        bucket_name = self._get_bucket_name(user)
        client = MinioClient().client
        try:
            client.remove_object(bucket_name, report_location)
        except Exception as e:
            return PublishResult(
                success=False, error=f"Failed to delete plaintext report: {e}"
            )
        return PublishResult(success=True, data=f"Deleted: {report_location}")

    def _get_bucket_name(self, user: CradleUser) -> str:
        return str(user.id) if user else "default_bucket"

    def _build_text(self, title: str, notes: List[Note]) -> str:
        contents = []
        for note in notes:
            anonymized_note = self._anonymize_note(note)
            contents.append(anonymized_note.content)
        separator = "\n-----\n"
        notes_text = separator.join(contents)
        return f"{title}\n\n{notes_text}"

    def _upload_text(
        self, text: str, user: CradleUser, file_name: str, action: str
    ) -> PublishResult:
        bucket_name = self._get_bucket_name(user)
        client = MinioClient().client
        data = BytesIO(text.encode("utf-8"))
        size = len(text)
        content_type = "text/plain"

        try:
            client.put_object(
                bucket_name, file_name, data, size, content_type=content_type
            )
        except Exception as e:
            return PublishResult(
                success=False, error=f"Failed to {action} plaintext report: {e}"
            )
        return PublishResult(success=True, data=file_name)
