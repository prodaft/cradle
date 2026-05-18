"""Digest API views: list, create, upload, and detail."""

import uuid

from django.urls import reverse
from django_filters.rest_framework import DjangoFilterBackend
from django_lifecycle.mixins import transaction
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import status
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.generics import GenericAPIView
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from core.exceptions import CoreErrorCodes, InvalidRequestException
from core.openapi import get_common_error_responses, get_error_responses
from core.pagination import TotalPagesPagination
from core.utils import validate_order_by
from file_transfer.storage import DigestStorage
from file_transfer.uploads import PresignedUploadFlow, UploadConfig
from file_transfer.uploads.exceptions import (
    AlreadyUploadingException,
    FileNotUploadedException,
    InvalidFileNameException,
    InvalidFileSizeException,
    UploadErrorCodes,
    UploadExpiredException,
    UploadNotFoundException,
)
from user.authentication import APIKeyAuthentication

from ..enums import DigestStatus
from ..exceptions import (
    DigestNotFoundException,
    DigestUploadExpiredException,
    DigestUploadIncompleteException,
    DigestUploadNotFoundException,
    IntelIOErrorCodes,
    MissingFileException,
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


def _get_digest_or_404(request: Request, pk: uuid.UUID) -> BaseDigest:
    """Get digest by pk, raising DigestNotFoundException if not found or not permitted."""
    try:
        if request.user.is_cradle_admin:
            return BaseDigest.objects.get(id=pk)
        return BaseDigest.objects.get(id=pk, user=request.user)
    except BaseDigest.DoesNotExist:
        raise DigestNotFoundException(detail="That digest could not be found.")


# Digest upload flow configuration and callbacks
def _digest_object_key_generator(upload_id: uuid.UUID, file_name: str, user) -> str:
    """Generate object key for digest uploads: {user_id}/{upload_id}."""
    return f"{user.id}/{upload_id}"


class DigestUploadCallbacks:
    """Callbacks for digest upload lifecycle."""

    def on_finalize_success(self, pending_upload, **validated_data) -> dict:
        """Create BaseDigest after successful upload.

        Args:
            pending_upload: The pending upload record.
            **validated_data: Validated data from DigestUploadFinalizeCreateSerializer.

        Returns:
            dict with digest object to serialize.
        """
        digest_data = validated_data.copy()
        entities = digest_data.pop("entities", [])

        # Get the digest model class (BaseDigest or subclass)
        digest_model = digest_data.pop("_digest_model", BaseDigest)

        # Create digest instance
        digest = digest_model(
            id=pending_upload.id,
            user=pending_upload.user,
            **digest_data,
        )

        # Set the file field to point to the already-uploaded object
        digest.file.name = pending_upload.object_key
        digest.save()

        # Set entities if provided
        if entities:
            digest.entities.set(entities)

        # Trigger digest processing
        transaction.on_commit(lambda: start_digest.delay(digest.id))

        return {"digest": digest}


# Create the digest upload flow instance
digest_upload_flow = PresignedUploadFlow(
    config=UploadConfig(
        bucket_name=DigestStorage.bucket_name,
        object_key_generator=_digest_object_key_generator,
        allow_concurrent_per_user=True,  # Admins can have concurrent uploads
    ),
    pending_model=PendingDigestUpload,
    callbacks=DigestUploadCallbacks(),
)


@extend_schema(
    summary="Initiate digest file upload",
    description="Generates a presigned URL for uploading a digest file. Checks user's upload quota before generating URL. Returns upload_id, presigned_url, object_key, and expires_in. The upload must be finalized within the expiration time.",
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
        200: DigestUploadResponseSerializer,
        **get_error_responses(
            UploadErrorCodes.INVALID_FILE_NAME,
            UploadErrorCodes.ALREADY_UPLOADING,
            UploadErrorCodes.INVALID_FILE_SIZE,
            UploadErrorCodes.QUOTA_EXCEEDED,
        ),
        **get_common_error_responses(),
    },
    methods=["GET"],
)
class DigestUploadAPIView(APIView):
    authentication_classes = [JWTAuthentication, APIKeyAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        file_name = request.query_params.get("file_name")
        if not file_name:
            raise InvalidFileNameException(detail="A file name is required.")

        # Get and validate file size
        file_size_str = request.query_params.get("file_size")
        if not file_size_str:
            raise InvalidFileSizeException(detail="The file size is required.")

        try:
            file_size = int(file_size_str)
        except ValueError:
            raise InvalidFileSizeException(detail="Use a whole number for the file size.")

        # Non-admin users cannot have concurrent uploads
        # (admins can have multiple pending uploads)
        if PendingDigestUpload.objects.filter(user=request.user).exists() and not request.user.is_cradle_admin:
            raise AlreadyUploadingException(
                detail="You already have an open upload session. Please finalize the previous upload before starting a new one."
            )

        response_data = digest_upload_flow.initiate(request.user, file_name, file_size)
        return Response(DigestUploadResponseSerializer(response_data).data, status=status.HTTP_200_OK)


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
            CoreErrorCodes.INVALID_REQUEST_DATA,
            CoreErrorCodes.INVALID_REQUEST,
            IntelIOErrorCodes.DIGEST_UPLOAD_NOT_FOUND,
            IntelIOErrorCodes.DIGEST_UPLOAD_EXPIRED,
            IntelIOErrorCodes.DIGEST_UPLOAD_INCOMPLETE,
            include_validation_error=True,
        ),
        **get_common_error_responses(),
    },
    methods=["POST"],
)
class DigestUploadFinalizeAPIView(APIView):
    authentication_classes = [JWTAuthentication, APIKeyAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request: Request, upload_id: str) -> Response:
        # Validate request body
        serializer = DigestUploadFinalizeCreateSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)

        # Get digest model from serializer
        validated_data = serializer.validated_data.copy()
        validated_data["_digest_model"] = serializer.Meta.model or BaseDigest

        # Validate upload_id format before calling finalize
        try:
            upload_uuid = uuid.UUID(upload_id)
        except ValueError:
            raise InvalidRequestException(detail="That upload session is not valid.")

        try:
            response_data = digest_upload_flow.finalize(upload_uuid, request.user, **validated_data)
        except UploadNotFoundException as exc:
            raise DigestUploadNotFoundException(detail=exc.detail) from exc
        except UploadExpiredException as exc:
            raise DigestUploadExpiredException(detail=exc.detail) from exc
        except FileNotUploadedException as exc:
            raise DigestUploadIncompleteException(detail=exc.detail) from exc

        # Extract digest from response
        digest = response_data["digest"]
        location = request.build_absolute_uri(reverse("digest_detail", kwargs={"pk": digest.id}))
        return Response(
            BaseDigestSerializer(digest).data,
            status=status.HTTP_201_CREATED,
            headers={"Location": location},
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
    """DRF API view that returns all BaseDigest subclasses with their names."""

    authentication_classes = [JWTAuthentication, APIKeyAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request: Request, *args, **kwargs) -> Response:
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
        return Response(serializer.data, status=status.HTTP_200_OK)


@extend_schema_view(
    get=extend_schema(
        operation_id="intelio_digest_list",
        summary="List digests",
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
            200: TotalPagesPagination().get_paginated_response_serializer(BaseDigestSerializer),
            **get_error_responses(
                CoreErrorCodes.INVALID_PAGE_SIZE,
                CoreErrorCodes.PAGE_SIZE_TOO_LARGE,
                CoreErrorCodes.INVALID_REQUEST,
            ),
            **get_common_error_responses(),
        },
    ),
    post=extend_schema(
        operation_id="intelio_digest_create",
        summary="Create digest",
        description="Create a new digest for the current user with file upload.",
        request=BaseDigestCreateSerializer,
        responses={
            201: BaseDigestSerializer,
            **get_error_responses(
                IntelIOErrorCodes.MISSING_FILE,
                include_validation_error=True,
            ),
            **get_common_error_responses(),
        },
    ),
)
class DigestAPIView(GenericAPIView):
    authentication_classes = [JWTAuthentication, APIKeyAuthentication]
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser]
    serializer_class = BaseDigestSerializer
    queryset = BaseDigest.objects.all()
    filter_backends = [DjangoFilterBackend]
    filterset_class = BaseDigestFilter
    pagination_class = TotalPagesPagination

    def get(self, request: Request) -> Response:
        """Fetch all digests for the current user with optional filtering."""
        if request.user.is_cradle_admin:
            queryset = BaseDigest.objects.all()
        else:
            queryset = BaseDigest.objects.filter(user=request.user)

        # Apply filters
        filterset = self.filterset_class(request.GET, queryset=queryset)
        if filterset.is_valid():
            queryset = filterset.qs
        else:
            raise DRFValidationError(filterset.errors)

        # Handle ordering
        order_by = request.query_params.get("order_by", "-created_at")
        valid_order_fields = [
            "created_at",
            "title",
            "user__username",
            "status",
            "digest_type",
        ]

        # Parse and validate order_by parameter
        order_fields = validate_order_by(order_by, valid_order_fields)
        if order_fields:
            queryset = queryset.order_by(*order_fields)
        else:
            queryset = queryset.order_by("-created_at")

        # Apply pagination
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(queryset, request)

        serializer = self.get_serializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    def post(self, request: Request) -> Response:
        """Create a new digest for the current user."""
        data = request.data.copy()

        # Use the create serializer for validation
        create_serializer = BaseDigestCreateSerializer(data=data, context={"request": request})
        create_serializer.is_valid(raise_exception=True)

        # Create the digest and assign the current user
        digest_data = create_serializer.validated_data.copy()
        digest_data.pop("file", None)  # Remove file from digest creation data
        digest_data["user"] = request.user  # Assign the current user

        digest = BaseDigest(**digest_data)

        file = request.FILES.get("file")

        if not file:
            raise MissingFileException(detail="Upload a file to create a digest.")

        # Assign file to FileField - Django handles storage automatically
        with transaction.atomic():
            digest.file = file
            digest.save()

        transaction.on_commit(lambda: start_digest.delay(digest.id))
        location = request.build_absolute_uri(reverse("digest_detail", kwargs={"pk": digest.id}))
        return Response(
            self.get_serializer(digest).data,
            status=status.HTTP_201_CREATED,
            headers={"Location": location},
        )


@extend_schema_view(
    get=extend_schema(
        operation_id="intelio_digest_retrieve",
        summary="Retrieve digest",
        description="Retrieve a specific digest by ID. Admins can access any digest; users can only access their own.",
        responses={
            200: BaseDigestSerializer,
            **get_error_responses(IntelIOErrorCodes.DIGEST_NOT_FOUND),
            **get_common_error_responses(),
        },
    ),
    delete=extend_schema(
        summary="Delete digest",
        description="Delete a specific digest by ID.",
        responses={
            204: {"description": "Digest deleted successfully"},
            **get_error_responses(IntelIOErrorCodes.DIGEST_NOT_FOUND),
            **get_common_error_responses(),
        },
    ),
)
class DigestDetailAPIView(APIView):
    authentication_classes = [JWTAuthentication, APIKeyAuthentication]
    permission_classes = [IsAuthenticated]
    serializer_class = BaseDigestSerializer

    def get(self, request: Request, pk: uuid.UUID) -> Response:
        digest = _get_digest_or_404(request, pk)
        return Response(
            BaseDigestSerializer(digest).data,
            status=status.HTTP_200_OK,
        )

    def delete(self, request: Request, pk: uuid.UUID) -> Response:
        """Delete a specific digest by ID."""
        from entries.tasks import refresh_edges_materialized_view

        digest = _get_digest_or_404(request, pk)
        with transaction.atomic():
            digest.delete()

        refresh_edges_materialized_view.apply_async()
        return Response(status=status.HTTP_204_NO_CONTENT)
