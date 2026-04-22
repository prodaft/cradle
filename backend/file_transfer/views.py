"""File transfer API views: upload (initiate/finalize), download, delete, process.

Uses presigned URLs for direct S3 uploads; validates quota and access.
"""

import logging
import os
import uuid

from botocore.exceptions import ClientError
from django.core.exceptions import ValidationError
from django.db.models import Sum
from django.urls import reverse
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from pathvalidate import sanitize_filename
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from core.openapi import get_common_error_responses, get_error_responses
from notes.models import Note

from .constants import FILE_TRANSFER_PRESIGNED_DOWNLOAD_EXPIRY_SECONDS
from .exceptions import (
    FileAccessDeniedException,
    FileReferenceNotFoundException,
    FileTransferErrorCodes,
    FileTransferNoteNotFoundException,
    InvalidFileReferenceException,
    NoFileSpecifiedException,
    StoredFileNotFoundException,
)
from .models import FileReference, PendingUpload
from .s3_utils import get_file_transfer_storage, presign_get
from .serializers import (
    FileDownloadSerializer,
    FileProcessSerializer,
    FileUploadFinalizeResponseSerializer,
    FileUploadFinalizeSerializer,
    FileUploadResponseSerializer,
)
from .storage import FileTransferStorage
from .uploads import PresignedUploadFlow, UploadConfig
from .uploads.exceptions import (
    InvalidFileNameException,
    InvalidFileSizeException,
    QuotaExceededException,
    UploadErrorCodes,
)


def _sanitize_filename(name: str | None, *, default: str | None = None) -> str:
    """Sanitize filename: strip path traversal, replace invalid chars.

    If default is set, return it on invalid input; otherwise raise InvalidFileNameException.
    """
    if not name or not name.strip():
        if default is not None:
            return default
        raise InvalidFileNameException(detail="The file name is invalid or missing.")

    base = os.path.basename(name.strip())
    if not base:
        if default is not None:
            return default
        raise InvalidFileNameException(detail="The file name is invalid or missing.")

    def _on_empty(_):
        if default is not None:
            return default
        raise InvalidFileNameException(detail="The file name is invalid or missing.")

    try:
        safe = sanitize_filename(
            base,
            replacement_text="_",
            platform="universal",
            max_len=255,
            null_value_handler=_on_empty,
        )
        return safe if safe else (default or "")
    except InvalidFileNameException:
        raise
    except ValueError, TypeError, OSError:
        if default is not None:
            return default
        raise InvalidFileNameException(detail="The file name contains invalid characters.")


def _user_can_access_file(file_reference, user) -> bool:
    """Check if user has permission to access the file."""
    if user.is_cradle_admin:
        return True
    if file_reference.note_id:
        return Note.objects.get_accessible_notes(user).filter(id=file_reference.note_id).exists()
    if file_reference.digest_id:
        return file_reference.digest.user_id == user.id
    if file_reference.user_id:
        return file_reference.user_id == user.id
    return False


logger = logging.getLogger(__name__)


def get_storage():
    """Get FileTransferStorage, ensuring bucket exists for presigned URL generation."""
    try:
        return get_file_transfer_storage(ensure_bucket=True)
    except (OSError, ClientError) as e:
        logger.warning("Bucket creation check failed: %s", e)
        return FileTransferStorage()


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
            FileTransferNoteNotFoundException: If note_id provided but note not found.
            InvalidFileSizeException: If file size cannot be determined.
            QuotaExceededException: If file size or total quota is exceeded.
        """
        storage = get_storage()

        # Get file size (re-check against quota; client could bypass declared size)
        file_size = None
        try:
            file_size = storage.size(pending_upload.object_key)
        except OSError, ClientError:
            try:
                storage.delete(pending_upload.object_key)
            except OSError, ClientError:
                pass
            raise InvalidFileSizeException(detail="The file size could not be determined.")

        # Re-validate quota against actual size (client could upload larger than declared)
        if file_size > pending_upload.user.file_upload_limit:
            try:
                storage.delete(pending_upload.object_key)
            except OSError, ClientError:
                pass
            raise QuotaExceededException(
                detail=f"File size ({file_size} bytes) exceeds your upload limit ({pending_upload.user.file_upload_limit} bytes)."
            )
        existing_total = (
            FileReference.objects.filter(user=pending_upload.user).aggregate(total=Sum("file_size"))["total"] or 0
        )
        if existing_total + file_size > pending_upload.user.file_upload_limit:
            try:
                storage.delete(pending_upload.object_key)
            except OSError, ClientError:
                pass
            raise QuotaExceededException(
                detail=f"Upload would exceed your quota. "
                f"Current usage: {existing_total} bytes, "
                f"New file: {file_size} bytes, "
                f"Limit: {pending_upload.user.file_upload_limit} bytes."
            )

        # Get note if provided (verify user has access)
        note = None
        if note_id:
            try:
                note = Note.objects.get_accessible_notes(pending_upload.user).get(id=note_id)
            except Note.DoesNotExist:
                raise FileTransferNoteNotFoundException(detail="That note could not be found.")

        # Create FileReference
        file_reference = FileReference(
            file_name=pending_upload.file_name,
            note=note,
            user=pending_upload.user,
            file_size=file_size,
        )
        # Set the file field to point to the already-uploaded object
        file_reference.file.name = pending_upload.object_key
        file_reference.save()

        return {
            "file_id": file_reference.id,
            "file_name": file_reference.file_name,
            "object_key": pending_upload.object_key,
        }


# Create the upload flow instance
file_upload_flow = PresignedUploadFlow(
    config=UploadConfig(bucket_name=FileTransferStorage.bucket_name),
    pending_model=PendingUpload,
    callbacks=FileUploadCallbacks(),
)


@extend_schema_view(
    get=extend_schema(
        operation_id="file_transfer_upload_retrieve",
        summary="Initiate file upload",
        description="Generates a presigned URL for uploading a file. Checks user's upload quota before generating URL. Returns upload_id, presigned_url, object_key, and expires_in. The upload must be finalized within the expiration time.",
        parameters=[
            OpenApiParameter(
                name="file_name",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Name of the file to be uploaded",
                required=True,
            ),
            OpenApiParameter(
                name="file_size",
                type=int,
                location=OpenApiParameter.QUERY,
                description="Size of the file to be uploaded in bytes",
                required=True,
            ),
        ],
        responses={
            200: FileUploadResponseSerializer,
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
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        """Generate a presigned URL for file upload.

        Creates a PendingUpload record and schedules a cleanup task for when the
        upload expires. The client should upload the file to the presigned URL
        and then call the finalize endpoint.

        Args:
            request: The request with query parameters `file_name` and `file_size`.

        Returns:
            Response with upload_id, presigned_url, object_key, and expires_in.
        """
        file_name = request.query_params.get("file_name")
        if not file_name:
            raise InvalidFileNameException(detail="A file name is required.")
        file_name = _sanitize_filename(file_name)

        # Get and validate file size
        file_size_str = request.query_params.get("file_size")
        if not file_size_str:
            raise InvalidFileSizeException(detail="The file size is required.")

        try:
            file_size = int(file_size_str)
        except ValueError:
            raise InvalidFileSizeException(detail="Use a whole number for the file size.")

        response_data = file_upload_flow.initiate(request.user, file_name, file_size)
        return Response(FileUploadResponseSerializer(response_data).data, status=status.HTTP_200_OK)


@extend_schema_view(
    post=extend_schema(
        operation_id="file_transfer_upload_finalize_create",
        summary="Finalize file upload",
        description="Verifies the file was uploaded to storage and creates a FileReference. Optionally connects the file to a note.",
        parameters=[
            OpenApiParameter(
                name="upload_id",
                type=str,
                location=OpenApiParameter.PATH,
                description="The upload ID returned from the upload initiation",
                required=True,
            ),
        ],
        request=FileUploadFinalizeSerializer,
        responses={
            201: FileUploadFinalizeResponseSerializer,
            **get_error_responses(
                UploadErrorCodes.UPLOAD_NOT_FOUND,
                UploadErrorCodes.UPLOAD_EXPIRED,
                UploadErrorCodes.FILE_NOT_UPLOADED,
                UploadErrorCodes.INVALID_FILE_SIZE,
                UploadErrorCodes.QUOTA_EXCEEDED,
                FileTransferErrorCodes.FILE_TRANSFER_NOTE_NOT_FOUND,
                include_validation_error=True,
            ),
            **get_common_error_responses(),
        },
    )
)
class FileUploadFinalize(APIView):
    authentication_classes = [JWTAuthentication]
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
        # Parse request body for note_id
        serializer = FileUploadFinalizeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Finalize upload via flow
        response_data = file_upload_flow.finalize(upload_id, request.user, **serializer.validated_data)
        download_url = reverse("file_download") + f"?file_id={response_data['file_id']}"
        location = request.build_absolute_uri(download_url)
        return Response(
            FileUploadFinalizeResponseSerializer(response_data).data,
            status=status.HTTP_201_CREATED,
            headers={"Location": location},
        )


@extend_schema_view(
    get=extend_schema(
        operation_id="file_transfer_download_retrieve",
        summary="Get file download URL",
        description="Generates a presigned URL for downloading a file.",
        parameters=[
            OpenApiParameter(
                name="file_id",
                type=str,
                location=OpenApiParameter.QUERY,
                description="UUID of the file reference",
                required=True,
            ),
        ],
        responses={
            200: FileDownloadSerializer,
            **get_error_responses(
                FileTransferErrorCodes.NO_FILE_SPECIFIED,
                FileTransferErrorCodes.INVALID_FILE_REFERENCE,
                FileTransferErrorCodes.FILE_REFERENCE_NOT_FOUND,
                FileTransferErrorCodes.FILE_ACCESS_DENIED,
                FileTransferErrorCodes.STORED_FILE_NOT_FOUND,
            ),
            **get_common_error_responses(),
        },
    )
)
class FileDownload(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        """Generate a presigned URL for file download.

        Args:
            request: The request with query parameter `file_id`.

        Returns:
            Response with presigned_url and expires_in.
        """
        file_id = request.query_params.get("file_id")
        if not file_id:
            raise NoFileSpecifiedException(detail="Specify which file to use.")

        try:
            file_reference = FileReference.objects.get(id=file_id)
        except FileReference.DoesNotExist:
            raise FileReferenceNotFoundException(detail="That file could not be found.")
        except ValueError, TypeError, ValidationError:
            raise InvalidFileReferenceException(detail="That is not a valid file.")

        if not file_reference.file:
            raise StoredFileNotFoundException(detail="The file could not be found.")

        if not _user_can_access_file(file_reference, request.user):
            raise FileAccessDeniedException(detail="You do not have access to this file.")

        safe_filename = _sanitize_filename(file_reference.file_name, default="download")

        presigned_url = presign_get(
            FileTransferStorage.bucket_name,
            file_reference.file.name,
            expires_in=FILE_TRANSFER_PRESIGNED_DOWNLOAD_EXPIRY_SECONDS,
            response_content_disposition=f'attachment; filename="{safe_filename}"',
        )

        response_data = {
            "presigned_url": presigned_url,
            "expires_in": FILE_TRANSFER_PRESIGNED_DOWNLOAD_EXPIRY_SECONDS,
        }

        return Response(FileDownloadSerializer(response_data).data, status=status.HTTP_200_OK)


@extend_schema_view(
    post=extend_schema(
        operation_id="file_transfer_process_create",
        summary="Process an uploaded file",
        description="Triggers processing for a file (calculates hashes, mimetype, etc.).",
        request=FileProcessSerializer,
        responses={
            202: {"description": "Request accepted for processing"},
            **get_error_responses(
                FileTransferErrorCodes.FILE_REFERENCE_NOT_FOUND,
                FileTransferErrorCodes.FILE_ACCESS_DENIED,
                include_validation_error=True,
            ),
            **get_common_error_responses(),
        },
    )
)
class FileProcess(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request: Request) -> Response:
        """Triggers processing for a file.

        Args:
            request: The request with file_id in body.

        Returns:
            Response with success message.
        """
        serializer = FileProcessSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            file_reference = FileReference.objects.get(id=serializer.validated_data["file_id"])
            if not _user_can_access_file(file_reference, request.user):
                raise FileAccessDeniedException(detail="You do not have access to this file.")
            file_reference.process_file()

            return Response({"detail": "File processing started"}, status=status.HTTP_202_ACCEPTED)
        except FileReference.DoesNotExist:
            raise FileReferenceNotFoundException(detail="That file could not be found.")


@extend_schema_view(
    delete=extend_schema(
        operation_id="file_transfer_delete_destroy",
        summary="Delete a file reference",
        description="Deletes a file reference and removes the associated file from storage.",
        parameters=[
            OpenApiParameter(
                name="file_id",
                type=str,
                location=OpenApiParameter.QUERY,
                description="UUID of the file reference to delete",
                required=True,
            )
        ],
        responses={
            204: {"description": "File reference deleted successfully"},
            **get_error_responses(
                FileTransferErrorCodes.NO_FILE_SPECIFIED,
                FileTransferErrorCodes.INVALID_FILE_REFERENCE,
                FileTransferErrorCodes.FILE_REFERENCE_NOT_FOUND,
                FileTransferErrorCodes.FILE_ACCESS_DENIED,
            ),
            **get_common_error_responses(),
        },
    )
)
class FileDelete(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def delete(self, request: Request) -> Response:
        """Delete a file reference and the associated file from storage.

        Args:
            request: The request with query parameter `file_id`.

        Returns:
            Empty response with 204 No Content on success.
        """
        file_id = request.query_params.get("file_id")
        if not file_id:
            raise NoFileSpecifiedException(detail="Specify which file to use.")

        try:
            file_reference = FileReference.objects.get(id=file_id)
            if not _user_can_access_file(file_reference, request.user):
                raise FileAccessDeniedException(detail="You do not have access to this file.")
            if file_reference.file:
                try:
                    file_reference.file.delete(save=False)
                except OSError, ClientError:
                    pass
            file_reference.delete()

            return Response(status=status.HTTP_204_NO_CONTENT)
        except FileReference.DoesNotExist:
            raise FileReferenceNotFoundException(detail="That file could not be found.")
        except ValueError, TypeError, ValidationError:
            raise InvalidFileReferenceException(detail="That is not a valid file.")
