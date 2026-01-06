import uuid
from datetime import timedelta

from django.utils import timezone
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
    AlreadyUploadingException,
    FileNotUploadedException,
    FileReferenceNotFoundException,
    FileTransferErrorCodes,
    InvalidFileNameException,
    InvalidRequestBodyException,
    MinioObjectNotFound,
    NoteNotFoundException,
    UploadExpiredException,
    UploadNotFoundException,
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

# Upload URL expiration time
UPLOAD_EXPIRY_SECONDS = 5 * 60  # 5 minutes
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


@extend_schema_view(
    get=extend_schema(
        summary="Initiate file upload",
        description="Generates a presigned URL for uploading a file. Returns upload_id, presigned_url, object_key, and expires_in. The upload must be finalized within the expiration time.",
        parameters=[
            OpenApiParameter(
                name="fileName",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Name of the file to be uploaded",
                required=True,
            )
        ],
        responses={
            200: FileUploadResponseSerializer,
            **get_error_responses(FileTransferErrorCodes.INVALID_FILE_NAME),
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
            request: The request with query parameter `fileName`.

        Returns:
            Response with upload_id, presigned_url, object_key, and expires_in.
        """
        file_name = request.query_params.get("fileName")
        if not file_name:
            raise InvalidFileNameException(
                detail="The 'fileName' query parameter is required."
            )

        if PendingUpload.objects.filter(user=request.user).exists():
            raise AlreadyUploadingException(
                detail="You already have an open upload session. Please finalize the previous upload before starting a new one."
            )

        # Generate unique object key
        upload_id = uuid.uuid4()
        object_key = f"{upload_id}-{file_name}"

        # Calculate expiration time
        expires_at = timezone.now() + timedelta(seconds=UPLOAD_EXPIRY_SECONDS)

        # Create pending upload record
        pending_upload = PendingUpload.objects.create(
            id=upload_id,
            object_key=object_key,
            file_name=file_name,
            user=request.user,
            expires_at=expires_at,
        )

        # Generate presigned URL for upload using boto3
        storage = get_storage()
        presigned_url = storage.connection.meta.client.generate_presigned_url(
            "put_object",
            Params={
                "Bucket": storage.bucket_name,
                "Key": object_key,
            },
            ExpiresIn=UPLOAD_EXPIRY_SECONDS,
        )

        # Schedule cleanup task for expired upload
        from .tasks import cleanup_expired_upload

        try:
            cleanup_expired_upload.apply_async(
                args=(str(pending_upload.id),),
                countdown=UPLOAD_EXPIRY_SECONDS + 60,  # Add 1 minute buffer
            )
        except Exception:
            # If Celery is not available, cleanup will happen via periodic task
            pass

        response_data = {
            "upload_id": upload_id,
            "presigned_url": presigned_url,
            "object_key": object_key,
            "expires_in": UPLOAD_EXPIRY_SECONDS,
        }

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

    def post(self, request: Request, upload_id: str) -> Response:
        """Finalize a file upload.

        Verifies the file exists in storage, creates a FileReference record,
        and optionally connects it to a note.

        Args:
            request: The request with optional note_id in body.
            upload_id: The upload ID from the initiation step.

        Returns:
            Response with file_id, file_name, and object_key.
        """
        # Get pending upload
        try:
            pending_upload = PendingUpload.objects.get(id=upload_id, user=request.user)
        except PendingUpload.DoesNotExist:
            raise UploadNotFoundException(
                detail=f"Upload with ID {upload_id} not found."
            )

        # Verify file exists in storage
        storage = get_storage()
        if not storage.exists(pending_upload.object_key):
            raise FileNotUploadedException(
                detail="File was not uploaded to the presigned URL."
            )

        # Check if upload has expired
        if pending_upload.is_expired:
            try:
                storage.delete(pending_upload.object_key)
            except Exception:
                pass
            pending_upload.delete()
            raise UploadExpiredException(
                detail="Upload has expired. Please initiate a new upload."
            )

        file_size = None
        try:
            file_size = storage.size(pending_upload.object_key)
        except Exception:
            try:
                storage.delete(pending_upload.object_key)
            except Exception:
                pass
            pending_upload.delete()
            raise FileNotUploadedException(detail="File size could not be determined.")

        # Parse request body for note_id
        serializer = FileUploadFinalizeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        note_id = serializer.validated_data.get("note_id")

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
            user=request.user,
            file_size=file_size,
        )
        # Set the file field to point to the already-uploaded object
        file_reference.file.name = pending_upload.object_key
        file_reference.save()

        # Delete pending upload
        pending_upload.delete()

        response_data = {
            "file_id": file_reference.id,
            "file_name": file_reference.file_name,
            "object_key": pending_upload.object_key,
        }

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
            raise InvalidFileNameException(
                detail="The 'fileId' query parameter is required."
            )

        try:
            file_reference = FileReference.objects.get(id=file_id)
        except FileReference.DoesNotExist:
            raise FileReferenceNotFoundException(
                detail=f"File reference with ID {file_id} not found."
            )
        except ValueError:
            raise InvalidFileNameException(
                detail="The 'fileId' parameter must be a valid UUID."
            )

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
            file_reference = FileReference.objects.get(
                id=serializer.validated_data["file_id"]
            )
            file_reference.process_file()

            return Response(
                {"message": "File processing started"}, status=status.HTTP_200_OK
            )
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
            raise InvalidFileNameException(
                detail="The 'fileId' query parameter is required."
            )

        try:
            file_reference = FileReference.objects.get(id=file_id)
            file_reference.delete()

            return Response(
                {"message": "File deleted successfully"}, status=status.HTTP_200_OK
            )
        except FileReference.DoesNotExist:
            raise FileReferenceNotFoundException(
                detail=f"File reference with ID {file_id} not found."
            )
        except ValueError:
            raise InvalidFileNameException(
                detail="The 'fileId' parameter must be a valid UUID."
            )
