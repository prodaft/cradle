import uuid

from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from core.openapi import get_common_error_responses, get_error_responses
from notes.models import Note

from .exceptions import (
    FileReferenceNotFoundException,
    FileTransferErrorCodes,
    InvalidRequestBodyException,
    MinioObjectNotFound,
    NoteNotFoundException,
)
from .models import FileReference, PendingUpload
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
    FileNotUploadedException,
    InvalidFileNameException,
    InvalidFileSizeException,
    UploadErrorCodes,
)

# Download URL expiration time
DOWNLOAD_EXPIRY_SECONDS = 7 * 24 * 60 * 60  # 7 days


def get_storage():
    """Get the file transfer storage instance."""
    storage = FileTransferStorage()
    # Ensure bucket exists before generating presigned URLs (S3/MinIO don't auto-create).
    try:
        from .s3_utils import ensure_bucket_exists

        ensure_bucket_exists(storage.bucket_name)
    except Exception:
        pass
    return storage


# Upload flow configuration and callbacks
def _file_object_key_generator(upload_id: uuid.UUID, file_name: str, user) -> str:
    """Generate object key for file uploads: {upload_id}-{filename}"""
    return f"{upload_id}-{file_name}"


class FileUploadCallbacks:
    """Callbacks for file upload lifecycle."""

    def on_finalize_success(self, pending_upload, note_id=None, **kwargs) -> dict:
        """
        Create FileReference after successful upload.

        Args:
            pending_upload: The pending upload record
            note_id: Optional UUID of note to link file to
            **kwargs: Additional parameters

        Returns:
            dict with file_id, file_name, object_key

        Raises:
            NoteNotFoundException: If note_id provided but note not found
            FileNotUploadedException: If file size cannot be determined
        """
        storage = get_storage()

        # Get file size
        file_size = None
        try:
            file_size = storage.size(pending_upload.object_key)
        except Exception:
            try:
                storage.delete(pending_upload.object_key)
            except Exception:
                pass
            raise FileNotUploadedException(detail="File size could not be determined.")

        # Get note if provided
        note = None
        if note_id:
            try:
                note = Note.objects.get(id=note_id)
            except Note.DoesNotExist:
                raise NoteNotFoundException(detail=f"Note with ID {note_id} not found.")

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
    config=UploadConfig(
        bucket_name=FileTransferStorage.bucket_name,
        object_key_generator=_file_object_key_generator,
    ),
    pending_model=PendingUpload,
    callbacks=FileUploadCallbacks(),
)


@extend_schema_view(
    get=extend_schema(
        summary="Initiate file upload",
        description="Generates a presigned URL for uploading a file. Checks user's upload quota before generating URL. Returns upload_id, presigned_url, object_key, and expires_in. The upload must be finalized within the expiration time.",
        parameters=[
            OpenApiParameter(
                name="fileName",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Name of the file to be uploaded",
                required=True,
            ),
            OpenApiParameter(
                name="fileSize",
                type=int,
                location=OpenApiParameter.QUERY,
                description="Size of the file to be uploaded in bytes",
                required=True,
            ),
        ],
        responses={
            200: FileUploadResponseSerializer,
            **get_error_responses(
                FileTransferErrorCodes.INVALID_FILE_NAME,
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
            request: The request with query parameters `fileName` and `fileSize`.

        Returns:
            Response with upload_id, presigned_url, object_key, and expires_in.
        """
        file_name = request.query_params.get("fileName")
        if not file_name:
            raise InvalidFileNameException(detail="The 'fileName' query parameter is required.")

        # Get and validate file size
        file_size_str = request.query_params.get("fileSize")
        if not file_size_str:
            raise InvalidFileSizeException(detail="The 'fileSize' query parameter is required.")

        try:
            file_size = int(file_size_str)
        except ValueError:
            raise InvalidFileSizeException(detail="The 'fileSize' parameter must be a valid integer.")

        response_data = file_upload_flow.initiate(request.user, file_name, file_size)
        return Response(FileUploadResponseSerializer(response_data).data)


@extend_schema_view(
    post=extend_schema(
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
                FileTransferErrorCodes.UPLOAD_NOT_FOUND,
                FileTransferErrorCodes.UPLOAD_EXPIRED,
                FileTransferErrorCodes.FILE_NOT_UPLOADED,
                FileTransferErrorCodes.NOTE_NOT_FOUND,
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

        return Response(
            FileUploadFinalizeResponseSerializer(response_data).data,
            status=status.HTTP_201_CREATED,
        )


@extend_schema_view(
    get=extend_schema(
        summary="Get file download URL",
        description="Generates a presigned URL for downloading a file.",
        parameters=[
            OpenApiParameter(
                name="fileId",
                type=str,
                location=OpenApiParameter.QUERY,
                description="UUID of the file reference",
                required=True,
            ),
        ],
        responses={
            200: FileDownloadSerializer,
            **get_error_responses(
                FileTransferErrorCodes.INVALID_FILE_NAME,
                FileTransferErrorCodes.FILE_REFERENCE_NOT_FOUND,
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
            request: The request with query parameter `fileId`.

        Returns:
            Response with presigned_url and expires_in.
        """
        file_id = request.query_params.get("fileId")
        if not file_id:
            raise InvalidFileNameException(detail="The 'fileId' query parameter is required.")

        try:
            file_reference = FileReference.objects.get(id=file_id)
        except FileReference.DoesNotExist:
            raise FileReferenceNotFoundException(detail=f"File reference with ID {file_id} not found.")
        except ValueError:
            raise InvalidFileNameException(detail="The 'fileId' parameter must be a valid UUID.")

        if not file_reference.file:
            raise MinioObjectNotFound(detail="File not found in storage.")

        # Generate presigned URL for download
        storage = get_storage()
        presigned_url = storage.connection.meta.client.generate_presigned_url(
            "get_object",
            Params={
                "Bucket": storage.bucket_name,
                "Key": file_reference.file.name,
                "ResponseContentDisposition": f'attachment; filename="{file_reference.file_name}"',
            },
            ExpiresIn=DOWNLOAD_EXPIRY_SECONDS,
        )

        response_data = {
            "presigned_url": presigned_url,
            "expires_in": DOWNLOAD_EXPIRY_SECONDS,
        }

        return Response(FileDownloadSerializer(response_data).data)


@extend_schema_view(
    post=extend_schema(
        summary="Process an uploaded file",
        description="Triggers processing for a file (calculates hashes, mimetype, etc.).",
        request=FileProcessSerializer,
        responses={
            200: {"description": "File processing started successfully"},
            **get_error_responses(
                FileTransferErrorCodes.INVALID_REQUEST_BODY,
                FileTransferErrorCodes.FILE_REFERENCE_NOT_FOUND,
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
        if not serializer.is_valid():
            raise InvalidRequestBodyException(detail="Request body validation failed.")

        try:
            file_reference = FileReference.objects.get(id=serializer.validated_data["file_id"])
            file_reference.process_file()

            return Response({"message": "File processing started"}, status=status.HTTP_200_OK)
        except FileReference.DoesNotExist:
            raise FileReferenceNotFoundException(
                detail=f"File reference with ID {serializer.validated_data['file_id']} not found."
            )


@extend_schema_view(
    delete=extend_schema(
        summary="Delete a file reference",
        description="Deletes a file reference and removes the associated file from storage.",
        parameters=[
            OpenApiParameter(
                name="fileId",
                type=str,
                location=OpenApiParameter.QUERY,
                description="UUID of the file reference to delete",
                required=True,
            )
        ],
        responses={
            200: {"description": "File reference deleted successfully"},
            **get_error_responses(
                FileTransferErrorCodes.INVALID_FILE_NAME,
                FileTransferErrorCodes.FILE_REFERENCE_NOT_FOUND,
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
            request: The request with query parameter `fileId`.

        Returns:
            Response with success message.
        """
        file_id = request.query_params.get("fileId")
        if not file_id:
            raise InvalidFileNameException(detail="The 'fileId' query parameter is required.")

        try:
            file_reference = FileReference.objects.get(id=file_id)
            file_reference.delete()

            return Response({"message": "File deleted successfully"}, status=status.HTTP_200_OK)
        except FileReference.DoesNotExist:
            raise FileReferenceNotFoundException(detail=f"File reference with ID {file_id} not found.")
        except ValueError:
            raise InvalidFileNameException(detail="The 'fileId' parameter must be a valid UUID.")
