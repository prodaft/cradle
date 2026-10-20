"""File transfer API views: upload (initiate/finalize), download, delete, process.

Uses presigned URLs for direct S3 uploads; validates quota and access.
"""

import logging
import uuid
from datetime import timedelta

from botocore.exceptions import ClientError
from django.urls import reverse
from django.utils import timezone
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from core.exceptions import CoreErrorCodes
from core.openapi import get_common_error_responses, get_error_responses
from notes.models import Note
from notes.views.note_view import FileDetail as NoteFileDetail
from user.authentication import CookieJWTAuthentication

from .constants import FILE_TRANSFER_PRESIGNED_DOWNLOAD_EXPIRY_SECONDS
from .exceptions import (
    FileAccessDeniedException,
    FileReferenceNotFoundException,
    FileTransferErrorCodes,
    FileTransferNoteNotFoundException,
    StoredFileNotFoundException,
)
from .models import FileReference, PendingUpload
from .serializers import (
    FileDownloadSerializer,
    FileUploadFinalizeResponseSerializer,
    FileUploadFinalizeSerializer,
    FileUploadInitiateSerializer,
    FileUploadResponseSerializer,
)
from .storage import FileTransferStorage
from .uploads import (
    PresignedUploadFlow,
    UploadConfig,
    check_upload_quota,
    parse_initiate_request,
    sanitize_upload_filename,
)
from .uploads.exceptions import (
    InvalidFileSizeException,
    QuotaExceededException,
    UploadAccessDeniedException,
    UploadErrorCodes,
)

logger = logging.getLogger(__name__)


class FileUploadCallbacks:
    """Callbacks for file upload lifecycle."""

    def on_finalize_success(self, pending_upload, note_id=None, **kwargs) -> dict:
        """Create FileReference after successful upload.

        Args:
            pending_upload: The pending upload record.
            note_id: Optional UUID of note to link file to.
            **kwargs: Additional parameters.

        Returns:
            dict with file_id, file_name, object_key.

        Raises:
            FileTransferNoteNotFoundException: If note_id provided but note not found or not readable.
            UploadAccessDeniedException: If note_id provided but user lacks write access on the note.
            InvalidFileSizeException: If file size cannot be determined.
            QuotaExceededException: If file size or total quota is exceeded.
        """
        storage = FileTransferStorage()
        file_size = None
        try:
            file_size = storage.size(pending_upload.object_key)
        except OSError, ClientError:
            try:
                storage.delete(pending_upload.object_key)
            except OSError, ClientError:
                pass
            raise InvalidFileSizeException(detail="The file size could not be determined.")

        try:
            check_upload_quota(pending_upload.user, file_size)
        except QuotaExceededException:
            try:
                storage.delete(pending_upload.object_key)
            except OSError, ClientError:
                pass
            raise

        note = None
        if note_id:
            try:
                note = Note.objects.get_accessible_notes(pending_upload.user).get(id=note_id)
            except Note.DoesNotExist:
                raise FileTransferNoteNotFoundException(detail="That note could not be found.")
            if not note.has_write_access(pending_upload.user):
                try:
                    storage.delete(pending_upload.object_key)
                except OSError, ClientError:
                    pass
                raise UploadAccessDeniedException(
                    detail="You do not have permission to upload files to this note.",
                )

        file_reference = FileReference(
            file_name=pending_upload.file_name,
            note=note,
            user=pending_upload.user,
            file_size=file_size,
        )
        file_reference.file.name = pending_upload.object_key
        file_reference.save()

        return {
            "file_id": file_reference.id,
            "file_name": file_reference.file_name,
            "object_key": pending_upload.object_key,
        }


file_upload_flow = PresignedUploadFlow(
    config=UploadConfig(
        bucket_name=FileTransferStorage.bucket_name,
    ),
    pending_model=PendingUpload,
    callbacks=FileUploadCallbacks(),
)


@extend_schema_view(
    post=extend_schema(
        operation_id="files_uploads_create",
        summary="Initiate file upload",
        description="Generates a presigned URL for uploading a file. Checks user's upload quota before generating URL. Returns upload_id, presigned_url, object_key, and expires_at. The upload must be finalized within the expiration time.",
        request=FileUploadInitiateSerializer,
        responses={
            201: FileUploadResponseSerializer,
            **get_error_responses(
                UploadErrorCodes.INVALID_FILE_NAME,
                UploadErrorCodes.INVALID_FILE_SIZE,
                UploadErrorCodes.QUOTA_EXCEEDED,
            ),
            **get_common_error_responses(),
        },
    )
)
class FileUpload(APIView):
    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request: Request) -> Response:
        """Generate a presigned URL for file upload.

        Creates a PendingUpload record and schedules a cleanup task for when the
        upload expires. The client should upload the file to the presigned URL
        and then call the finalize endpoint.

        Args:
            request: The request with body fields `file_name` and `file_size`.

        Returns:
            Response with upload_id, presigned_url, object_key, and expires_at.
        """
        file_name, file_size = parse_initiate_request(request.data)
        response_data = file_upload_flow.initiate(request.user, sanitize_upload_filename(file_name), file_size)
        return Response(FileUploadResponseSerializer(response_data).data, status=status.HTTP_201_CREATED)


@extend_schema_view(
    post=extend_schema(
        operation_id="files_uploads_finalize_create",
        summary="Finalize file upload",
        description="Verifies the file was uploaded to storage and creates a FileReference. Optionally connects the file to a note.",
        request=FileUploadFinalizeSerializer,
        responses={
            201: FileUploadFinalizeResponseSerializer,
            **get_error_responses(
                CoreErrorCodes.UNAUTHENTICATED,
                CoreErrorCodes.PERMISSION_DENIED,
                CoreErrorCodes.INTERNAL_SERVER_ERROR,
                UploadErrorCodes.UPLOAD_NOT_FOUND,
                UploadErrorCodes.UPLOAD_EXPIRED,
                UploadErrorCodes.FILE_NOT_UPLOADED,
                UploadErrorCodes.INVALID_FILE_SIZE,
                UploadErrorCodes.QUOTA_EXCEEDED,
                FileTransferErrorCodes.FILE_TRANSFER_NOTE_NOT_FOUND,
                UploadErrorCodes.FILE_UPLOAD_ACCESS_DENIED,
                include_validation_error=True,
            ),
        },
    )
)
class FileUploadFinalize(APIView):
    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request: Request, upload_id: uuid.UUID) -> Response:
        """Finalize a file upload.

        Verifies the file exists in storage, creates a FileReference record,
        and optionally connects it to a note.

        Args:
            request: The request with optional note_id in body.
            upload_id: The upload ID from the initiation step (UUID object from URL).

        Returns:
            Response with file_id, file_name, and object_key.
        """
        serializer = FileUploadFinalizeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        response_data = file_upload_flow.finalize(upload_id, request.user, **serializer.validated_data)
        download_url = reverse("file_download", kwargs={"file_id": response_data["file_id"]})
        location = request.build_absolute_uri(download_url)
        return Response(
            FileUploadFinalizeResponseSerializer(response_data).data,
            status=status.HTTP_201_CREATED,
            headers={"Location": location},
        )


def _get_file_or_404(user, file_id: uuid.UUID, *, write: bool = False) -> FileReference:
    """Return the file if ``user`` can read it, else 404; with ``write``, 403 when it is readable only."""
    file_reference = FileReference.objects.filter(id=file_id).first()
    if file_reference is None or not file_reference.has_access(user):
        raise FileReferenceNotFoundException(detail="That file could not be found.")
    if write and not file_reference.has_write_access(user):
        raise FileAccessDeniedException(detail="You do not have permission to change this file.")
    return file_reference


@extend_schema_view(
    get=extend_schema(
        operation_id="files_download_retrieve",
        summary="Get file download URL",
        description="Generates a presigned URL for downloading a file.",
        responses={
            200: FileDownloadSerializer,
            **get_error_responses(
                FileTransferErrorCodes.FILE_REFERENCE_NOT_FOUND,
                FileTransferErrorCodes.STORED_FILE_NOT_FOUND,
            ),
            **get_common_error_responses(),
        },
    )
)
class FileDownload(APIView):
    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request: Request, file_id: uuid.UUID) -> Response:
        """Generate a presigned URL for file download."""
        file_reference = _get_file_or_404(request.user, file_id)

        if not file_reference.file:
            raise StoredFileNotFoundException(detail="The file could not be found.")

        response_data = {
            "presigned_url": file_reference.download_url(expires_in=FILE_TRANSFER_PRESIGNED_DOWNLOAD_EXPIRY_SECONDS),
            "expires_at": timezone.now() + timedelta(seconds=FILE_TRANSFER_PRESIGNED_DOWNLOAD_EXPIRY_SECONDS),
        }

        return Response(FileDownloadSerializer(response_data).data, status=status.HTTP_200_OK)


@extend_schema_view(
    post=extend_schema(
        operation_id="files_process_create",
        summary="Process an uploaded file",
        description="Triggers processing for a file (calculates hashes, mimetype, etc.).",
        request=None,
        responses={
            202: {"description": "Request accepted for processing"},
            **get_error_responses(FileTransferErrorCodes.FILE_REFERENCE_NOT_FOUND),
            **get_common_error_responses(),
        },
    )
)
class FileProcess(APIView):
    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request: Request, file_id: uuid.UUID) -> Response:
        """Trigger processing for a file."""
        _get_file_or_404(request.user, file_id).process_file()
        return Response({"detail": "File processing started"}, status=status.HTTP_202_ACCEPTED)


@extend_schema_view(
    delete=extend_schema(
        operation_id="files_destroy",
        summary="Delete a file reference",
        description="Deletes a file reference and removes the associated file from storage.",
        responses={
            204: {"description": "File reference deleted successfully"},
            **get_error_responses(
                FileTransferErrorCodes.FILE_REFERENCE_NOT_FOUND,
                FileTransferErrorCodes.FILE_ACCESS_DENIED,
            ),
            **get_common_error_responses(),
        },
    )
)
class FileDetail(NoteFileDetail):
    """One file: GET (metadata, for files on a readable note) comes from the notes app; DELETE is here."""

    def delete(self, request: Request, file_id: uuid.UUID) -> Response:
        """Delete a file reference and the associated file from storage."""
        file_reference = _get_file_or_404(request.user, file_id, write=True)
        if file_reference.file:
            try:
                file_reference.file.delete(save=False)
            except OSError, ClientError:
                pass
        file_reference.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
