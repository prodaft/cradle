import uuid
from datetime import timedelta

from django.shortcuts import get_object_or_404
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from django_lifecycle.mixins import transaction
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import status
from rest_framework.generics import GenericAPIView
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from core.openapi import (
    get_common_error_responses,
    get_error_responses,
    get_validation_error_response,
)
from core.pagination import TotalPagesPagination
from core.utils import validate_order_by
from intelio.enums import DigestStatus
from user.authentication import APIKeyAuthentication

from ..exceptions import (
    AlreadyUploadingException,
    DigestFileNotUploadedException,
    DigestUploadExpiredException,
    DigestUploadNotFoundException,
    IntelioErrorCodes,
    InvalidFileNameException,
    InvalidPageSizeException,
    InvalidRequestBodyException,
    MissingDigestIdException,
    MissingFileException,
    PageSizeTooLargeException,
)
from ..filters import BaseDigestFilter
from ..models.base import BaseDigest
from ..models.uploads import PendingDigestUpload
from ..serializers import (
    BaseDigestCreateSerializer,
    BaseDigestSerializer,
    DigestSubclassSerializer,
    DigestUploadFinalizeCreateSerializer,
    DigestUploadResponseSerializer,
)
from ..tasks import start_digest

# Upload URL expiration time
DIGEST_UPLOAD_EXPIRY_SECONDS = 5 * 60  # 5 minutes


def get_digest_storage():
    """Get the digest storage instance."""
    from file_transfer.storage import DigestStorage

    storage = DigestStorage()
    # Ensure bucket exists before generating presigned URLs (S3/MinIO don't auto-create).
    try:
        from file_transfer.s3_utils import ensure_bucket_exists

        ensure_bucket_exists(storage.bucket_name)
    except Exception:
        # Best-effort; presign may still fail if storage is unavailable.
        pass
    return storage


@extend_schema(
    summary="Initiate digest file upload",
    description="Generates a presigned URL for uploading a digest file. Returns upload_id, presigned_url, object_key, and expires_in. The upload must be finalized within the expiration time.",
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
        200: DigestUploadResponseSerializer,
        **get_error_responses(
            IntelioErrorCodes.INVALID_FILE_NAME, IntelioErrorCodes.ALREADY_UPLOADING
        ),
        **get_common_error_responses(),
    },
    methods=["GET"],
)
class DigestUploadAPIView(APIView):
    authentication_classes = [JWTAuthentication, APIKeyAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        file_name = request.query_params.get("fileName")
        if not file_name:
            raise InvalidFileNameException(
                detail="The 'fileName' query parameter is required."
            )

        if (
            PendingDigestUpload.objects.filter(user=request.user).exists()
            and not request.user.is_cradle_admin
        ):
            raise AlreadyUploadingException(
                detail="You already have an open upload session. Please finalize the previous upload before starting a new one."
            )

        upload_id = uuid.uuid4()
        object_key = f"{request.user.id}/{upload_id}"
        expires_at = timezone.now() + timedelta(seconds=DIGEST_UPLOAD_EXPIRY_SECONDS)

        pending_upload = PendingDigestUpload.objects.create(
            id=upload_id,
            object_key=object_key,
            file_name=file_name,
            user=request.user,
            expires_at=expires_at,
        )

        storage = get_digest_storage()
        presigned_url = storage.connection.meta.client.generate_presigned_url(
            "put_object",
            Params={
                "Bucket": storage.bucket_name,
                "Key": object_key,
            },
            ExpiresIn=DIGEST_UPLOAD_EXPIRY_SECONDS,
        )

        from ..tasks import cleanup_expired_digest_upload

        try:
            cleanup_expired_digest_upload.apply_async(
                args=(str(pending_upload.id),),
                countdown=DIGEST_UPLOAD_EXPIRY_SECONDS + 60,
            )
        except Exception:
            pass

        response_data = {
            "upload_id": upload_id,
            "presigned_url": presigned_url,
            "object_key": object_key,
            "expires_in": DIGEST_UPLOAD_EXPIRY_SECONDS,
        }

        return Response(DigestUploadResponseSerializer(response_data).data)


@extend_schema(
    summary="Finalize digest file upload",
    description="Verifies the digest file was uploaded to storage and creates the digest record, then triggers processing.",
    parameters=[
        OpenApiParameter(
            name="upload_id",
            type=str,
            location=OpenApiParameter.PATH,
            description="The upload ID returned from initiation",
            required=True,
        ),
    ],
    request=DigestUploadFinalizeCreateSerializer,
    responses={
        201: BaseDigestSerializer,
        **get_error_responses(
            IntelioErrorCodes.DIGEST_UPLOAD_NOT_FOUND,
            IntelioErrorCodes.DIGEST_UPLOAD_EXPIRED,
            IntelioErrorCodes.DIGEST_FILE_NOT_UPLOADED,
            IntelioErrorCodes.INVALID_REQUEST_BODY,
        ),
        **get_validation_error_response(),
        **get_common_error_responses(),
    },
    methods=["POST"],
)
class DigestUploadFinalizeAPIView(APIView):
    authentication_classes = [JWTAuthentication, APIKeyAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request, upload_id: str):
        try:
            pending_upload = PendingDigestUpload.objects.get(
                id=upload_id, user=request.user
            )
        except ValueError:
            raise InvalidFileNameException(
                detail="The 'upload_id' parameter must be a valid UUID."
            )
        except PendingDigestUpload.DoesNotExist:
            raise DigestUploadNotFoundException(
                detail=f"Upload with ID {upload_id} not found."
            )

        storage = get_digest_storage()
        if not storage.exists(pending_upload.object_key):
            raise DigestFileNotUploadedException(
                detail="File was not uploaded to the presigned URL."
            )

        if pending_upload.is_expired:
            try:
                storage.delete(pending_upload.object_key)
            except Exception:
                pass
            pending_upload.delete()
            raise DigestUploadExpiredException(
                detail="Upload has expired. Please initiate a new upload."
            )

        serializer = DigestUploadFinalizeCreateSerializer(data=request.data)
        if not serializer.is_valid():
            raise InvalidRequestBodyException(detail="Request body validation failed.")

        digest_data = serializer.validated_data.copy()
        entities = digest_data.pop("entities", [])

        digest_model = serializer.Meta.model or BaseDigest
        digest = digest_model(
            id=pending_upload.id,
            user=request.user,
            **digest_data,
        )
        digest.save()

        if entities:
            digest.entities.set(entities)

        pending_upload.delete()

        transaction.on_commit(lambda: start_digest.delay(digest.id))

        return Response(
            BaseDigestSerializer(digest).data, status=status.HTTP_201_CREATED
        )


@extend_schema(
    summary="Get digest subclasses",
    description="Returns a list of all subclasses of BaseDigest with their names.",
    responses={
        200: DigestSubclassSerializer(many=True),
        **get_common_error_responses(),
    },
)
class DigestSubclassesAPIView(APIView):
    """
    DRF API view that returns a list of all subclasses of Enricment
    with their names.
    """

    authentication_classes = [JWTAuthentication, APIKeyAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        subclasses = BaseDigest.__subclasses__()

        subclass_data = [
            {
                "class": subclass.__name__,
                "name": subclass.display_name,
                "infer_entities": getattr(subclass, "infer_entities", False),
            }
            for subclass in subclasses
            if hasattr(subclass, "display_name")
        ]

        serializer = DigestSubclassSerializer(subclass_data, many=True)
        return Response(serializer.data)


@extend_schema(
    summary="Manage digests",
    description="Create and retrieve digests for the current user.",
    parameters=[
        OpenApiParameter(
            name="title",
            description="Filter by title (case-insensitive partial match)",
            required=False,
            type=str,
        ),
        OpenApiParameter(
            name="author",
            description="Filter by author username (case-insensitive partial match)",
            required=False,
            type=str,
        ),
        OpenApiParameter(
            name="status",
            description="Filter by status",
            required=False,
            type=str,
            enum=list(map(lambda x: x[0], DigestStatus.choices)),
        ),
        OpenApiParameter(
            name="created_date",
            description="Filter by creation date (YYYY-MM-DD format)",
            required=False,
            type=str,
        ),
        OpenApiParameter(
            name="created_at_gte",
            description="Filter by creation date greater than or equal to (ISO datetime format)",
            required=False,
            type=str,
        ),
        OpenApiParameter(
            name="created_at_lte",
            description="Filter by creation date less than or equal to (ISO datetime format)",
            required=False,
            type=str,
        ),
        OpenApiParameter(
            name="page_size",
            type=int,
            location=OpenApiParameter.QUERY,
            description="Number of digests to return per page. Max 200.",
            default=10,
        ),
        OpenApiParameter(
            name="page",
            type=int,
            location=OpenApiParameter.QUERY,
            description="Page number for pagination",
        ),
        OpenApiParameter(
            name="order_by",
            type=str,
            location=OpenApiParameter.QUERY,
            description="Order digests by field(s). Prefix with '-' for descending order. Multiple fields can be separated by commas. Valid fields: created_at, title, user__username, status, digest_type. Default: -created_at",  # noqa: E501
            required=False,
            default="-created_at",
        ),
    ],
    responses={
        200: TotalPagesPagination().get_paginated_response_serializer(
            BaseDigestSerializer
        ),
        **get_error_responses(
            IntelioErrorCodes.INVALID_PAGE_SIZE, IntelioErrorCodes.PAGE_SIZE_TOO_LARGE
        ),
        **get_common_error_responses(),
    },
    methods=["GET"],
)
@extend_schema(
    summary="Create digest",
    description="Create a new digest for the current user with file upload.",
    request=BaseDigestCreateSerializer,
    responses={
        201: BaseDigestSerializer,
        **get_error_responses(IntelioErrorCodes.MISSING_FILE),
        **get_validation_error_response(),
        **get_common_error_responses(),
    },
    methods=["POST"],
)
class DigestAPIView(GenericAPIView):
    authentication_classes = [JWTAuthentication, APIKeyAuthentication]
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser]
    serializer_class = BaseDigestSerializer
    queryset = BaseDigest.objects.all()
    filter_backends = [DjangoFilterBackend]
    filterset_class = BaseDigestFilter

    def get(self, request):
        """Fetch all digests for the current user with optional filtering."""
        if request.user.is_cradle_admin:
            queryset = BaseDigest.objects.all()
        else:
            queryset = BaseDigest.objects.filter(user=request.user)

        # Apply filters
        filterset = self.filterset_class(request.GET, queryset=queryset)
        if filterset.is_valid():
            queryset = filterset.qs

        if request.query_params.get("status"):
            queryset = queryset.filter(status=request.query_params.get("status"))

        # Handle page_size parameter
        try:
            page_size = int(request.query_params.get("page_size", 10))
        except ValueError:
            raise InvalidPageSizeException(
                detail="Invalid page_size value. Must be an integer."
            )

        if page_size > 200:
            raise PageSizeTooLargeException(
                detail="page_size cannot be greater than 200."
            )

        # Handle ordering
        order_by = request.query_params.get("order_by", "-created_at")
        valid_order_fields = [
            "created_at",
            "title",
            "user__username",
            "digest_type",
        ]

        # Parse and validate order_by parameter
        order_fields, error_response = validate_order_by(order_by, valid_order_fields)
        if error_response:
            return error_response

        if order_fields:
            queryset = queryset.order_by(*order_fields)
        else:
            queryset = queryset.order_by("-created_at")

        # Apply pagination
        paginator = TotalPagesPagination(page_size=page_size)

        result_page = paginator.paginate_queryset(queryset, request)

        serializer = self.get_serializer(result_page, many=True)
        return paginator.get_paginated_response(serializer.data)

    def post(self, request):
        """Create a new digest for the current user."""
        from file_transfer.storage import DigestStorage

        data = request.data.copy()

        # Use the create serializer for validation
        create_serializer = BaseDigestCreateSerializer(data=data)
        create_serializer.is_valid(raise_exception=True)

        # Create the digest and assign the current user
        digest_data = create_serializer.validated_data.copy()
        digest_data.pop("file", None)  # Remove file from digest creation data
        digest_data["user"] = request.user  # Assign the current user

        digest = BaseDigest(**digest_data)
        digest.save()

        file = request.FILES.get("file")

        if not file:
            raise MissingFileException(detail="Missing 'file' in request.")

        DigestStorage().save(digest.storage_key, file)

        transaction.on_commit(lambda: start_digest.delay(digest.id))
        return Response(self.get_serializer(digest).data, status=201)

    @extend_schema(
        summary="Delete digest",
        description="Delete a specific digest by ID.",
        parameters=[
            OpenApiParameter(
                name="id",
                type=str,
                location=OpenApiParameter.QUERY,
                description="The ID of the digest to delete",
            ),
        ],
        responses={
            204: {"description": "Digest deleted successfully"},
            **get_error_responses(
                IntelioErrorCodes.MISSING_DIGEST_ID, IntelioErrorCodes.DIGEST_NOT_FOUND
            ),
            **get_common_error_responses(),
        },
    )
    def delete(self, request):
        """
        Delete a specific digest by ID.
        Requires a query parameter: ?id=<digest_id>
        """
        from entries.tasks import refresh_edges_materialized_view

        digest_id = request.query_params.get("id")
        if not digest_id:
            raise MissingDigestIdException(detail="Missing 'id' query parameter.")

        if request.user.is_cradle_admin:
            digest = get_object_or_404(BaseDigest, id=digest_id)
        else:
            digest = get_object_or_404(BaseDigest, id=digest_id, user=request.user)

        digest.delete()

        refresh_edges_materialized_view.apply_async()
        return Response(status=status.HTTP_204_NO_CONTENT)
