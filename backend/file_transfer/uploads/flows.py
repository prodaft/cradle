"""Generic two-phase presigned upload flow."""

import logging
import uuid
from dataclasses import dataclass
from datetime import timedelta
from typing import TYPE_CHECKING, Callable, Generic, Protocol, Type, TypeVar

from django.db import models
from django.utils import timezone

from file_transfer.s3_utils import exists

from .exceptions import (
    AlreadyUploadingException,
    FileNotUploadedException,
    InvalidFileSizeException,
    QuotaExceededException,
    UploadExpiredException,
    UploadNotFoundException,
)

if TYPE_CHECKING:
    from user.models import CradleUser

    from .models import BasePendingUpload

logger = logging.getLogger("django.request")

T = TypeVar("T", bound="BasePendingUpload")


@dataclass
class UploadConfig:
    """Configuration for upload flow."""

    bucket_name: str
    expiry_seconds: int = 5 * 60  # 5 minutes
    allow_concurrent_per_user: bool = False
    object_key_generator: Callable[[uuid.UUID, str, "CradleUser"], str] = (
        lambda upload_id, file_name, user: f"{upload_id}-{file_name}"
    )


class UploadFlowCallbacks(Protocol):
    """
    Protocol defining callbacks for upload lifecycle events.

    Implementations should provide domain-specific logic for handling
    successful upload finalization.
    """

    def on_finalize_success(self, pending_upload: "BasePendingUpload", **kwargs) -> dict:
        """
        Called after upload is verified and before pending record is deleted.

        Args:
            pending_upload: The pending upload record
            **kwargs: Additional domain-specific parameters from finalize() call

        Returns:
            dict: Response data to return to client
        """
        ...


class PresignedUploadFlow(Generic[T]):
    """
    Reusable two-phase presigned upload flow.

    This class encapsulates the common logic for handling S3 presigned URL uploads:
    1. Initiate: Generate presigned URL and create pending upload record
    2. Upload: Client uploads directly to S3 (external to this flow)
    3. Finalize: Verify upload exists, call domain callback, cleanup

    Type Parameters:
        T: The concrete BasePendingUpload subclass to use

    Example:
        >>> config = UploadConfig(
        ...     bucket_name="cradle-files",
        ...     object_key_generator=lambda id, name, user: f"{id}-{name}",
        ... )
        >>> class MyCallbacks:
        ...     def on_finalize_success(self, pending_upload, **kwargs):
        ...         # Create domain model
        ...         return {"id": "..."}
        >>> flow = PresignedUploadFlow(config, PendingUpload, MyCallbacks())
        >>> result = flow.initiate(user, "file.txt")
        >>> # Client uploads to result["presigned_url"]
        >>> final = flow.finalize(result["upload_id"], user)
    """

    def __init__(
        self,
        config: UploadConfig,
        pending_model: Type[T],
        callbacks: UploadFlowCallbacks,
    ):
        """
        Initialize upload flow.

        Args:
            config: Upload configuration
            pending_model: Concrete model class for pending uploads
            callbacks: Domain-specific lifecycle callbacks
        """
        self.config = config
        self.pending_model = pending_model
        self.callbacks = callbacks

    def _get_storage(self):
        """Get storage instance for the configured bucket."""
        from file_transfer.s3_utils import _get_storage_for_bucket, ensure_bucket_exists

        storage = _get_storage_for_bucket(self.config.bucket_name)
        try:
            ensure_bucket_exists(self.config.bucket_name)
        except Exception as e:
            logger.warning(f"Could not ensure bucket exists: {e}")
        return storage

    def initiate(self, user: "CradleUser", file_name: str, file_size: int) -> dict:
        """
        Phase 1: Generate presigned URL and create pending upload.

        Args:
            user: The user initiating the upload
            file_name: Original filename
            file_size: Size of file to be uploaded in bytes

        Returns:
            dict with keys:
                - upload_id: UUID for this upload
                - presigned_url: S3 presigned PUT URL
                - object_key: S3 object key where file will be stored
                - expires_in: Seconds until URL expires

        Raises:
            AlreadyUploadingException: If user has pending upload and
                                        allow_concurrent_per_user is False
            InvalidFileSizeException: If file_size is invalid (<=0 or too large)
            QuotaExceededException: If upload would exceed user's quota
        """
        # Validate file size
        if file_size <= 0:
            raise InvalidFileSizeException(detail="File size must be greater than 0 bytes.")

        # Check user's upload limit
        if file_size > user.file_upload_limit:
            raise InvalidFileSizeException(
                detail=f"File size ({file_size} bytes) exceeds your upload limit ({user.file_upload_limit} bytes)."
            )

        # Check quota: sum of existing files + new file
        from file_transfer.models import FileReference

        existing_total = FileReference.objects.filter(user=user).aggregate(total=models.Sum("file_size"))["total"] or 0

        if existing_total + file_size > user.file_upload_limit:
            raise QuotaExceededException(
                detail=f"Upload would exceed your quota. "
                f"Current usage: {existing_total} bytes, "
                f"New file: {file_size} bytes, "
                f"Limit: {user.file_upload_limit} bytes."
            )

        # Check for existing uploads if configured
        if not self.config.allow_concurrent_per_user:
            if self.pending_model.objects.filter(user=user).exists():
                raise AlreadyUploadingException(
                    detail="You already have an open upload session. "
                    "Please finalize the previous upload before starting a new one."
                )

        # Generate unique upload ID and object key
        upload_id = uuid.uuid4()
        object_key = self.config.object_key_generator(upload_id, file_name, user)

        # Calculate expiration time
        expires_at = timezone.now() + timedelta(seconds=self.config.expiry_seconds)

        # Create pending upload record
        pending_upload = self.pending_model.objects.create(
            id=upload_id,
            object_key=object_key,
            file_name=file_name,
            user=user,
            expires_at=expires_at,
        )

        # Generate presigned URL for upload with size constraint
        storage = self._get_storage()
        presigned_url = storage.connection.meta.client.generate_presigned_url(
            "put_object",
            Params={
                "Bucket": storage.bucket_name,
                "Key": object_key,
                # Enforce exact file size (allow 1 byte variance for potential encoding differences)
                "ContentLength": file_size,
            },
            ExpiresIn=self.config.expiry_seconds,
        )

        # Schedule cleanup task for when upload expires
        from .tasks import cleanup_expired_upload_generic

        try:
            cleanup_expired_upload_generic.apply_async(
                args=(
                    str(pending_upload.id),
                    f"{self.pending_model._meta.app_label}.{self.pending_model.__name__}",
                    self.config.bucket_name,
                ),
                countdown=self.config.expiry_seconds + 60,  # Add 1 minute buffer
            )
        except Exception as e:
            # If Celery is not available, cleanup will happen via periodic task
            logger.warning(f"Could not schedule cleanup task: {e}")

        return {
            "upload_id": upload_id,
            "presigned_url": presigned_url,
            "object_key": object_key,
            "expires_in": self.config.expiry_seconds,
        }

    def finalize(self, upload_id: uuid.UUID, user: "CradleUser", **kwargs) -> dict:
        """
        Phase 2: Verify upload exists and finalize.

        Args:
            upload_id: The upload ID from initiate()
            user: The user finalizing the upload
            **kwargs: Domain-specific parameters passed to callback

        Returns:
            dict: Response data from on_finalize_success callback

        Raises:
            UploadNotFoundException: If pending upload not found
            UploadExpiredException: If upload has expired
            FileNotUploadedException: If file not found in storage
        """
        # Get pending upload
        try:
            pending_upload = self.pending_model.objects.get(id=upload_id, user=user)
        except self.pending_model.DoesNotExist:
            raise UploadNotFoundException(detail=f"Upload with ID {upload_id} not found.")

        # Verify file exists in storage
        if not exists(self.config.bucket_name, pending_upload.object_key):
            raise FileNotUploadedException(detail="File was not uploaded to the presigned URL.")

        # Check if upload has expired
        if pending_upload.is_expired:
            # Clean up the uploaded file
            try:
                from file_transfer.s3_utils import delete_object

                delete_object(self.config.bucket_name, pending_upload.object_key)
            except Exception as e:
                logger.warning(f"Could not delete expired upload {pending_upload.object_key}: {e}")

            pending_upload.delete()
            raise UploadExpiredException(detail="Upload has expired. Please initiate a new upload.")

        # Call domain-specific finalization logic
        response_data = self.callbacks.on_finalize_success(pending_upload, **kwargs)

        # Delete pending upload record
        pending_upload.delete()

        return response_data
