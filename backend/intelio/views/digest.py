from django_lifecycle.mixins import transaction
from rest_framework.parsers import MultiPartParser
from rest_framework.views import APIView
from rest_framework.generics import GenericAPIView
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from drf_spectacular.utils import extend_schema, OpenApiParameter
from django_filters.rest_framework import DjangoFilterBackend

from core.pagination import TotalPagesPagination
from core.utils import validate_order_by


from ..models.base import BaseDigest

from ..serializers import (
    BaseDigestSerializer,
    DigestSubclassSerializer,
    BaseDigestCreateSerializer,
)
from ..tasks import start_digest
from ..filters import BaseDigestFilter

from django.shortcuts import get_object_or_404
from user.authentication import APIKeyAuthentication


@extend_schema(
    summary="Get digest subclasses",
    description="Returns a list of all subclasses of BaseDigest with their names.",
    responses={
        200: DigestSubclassSerializer(many=True),
        401: {"description": "User is not authenticated"},
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
        401: {"description": "User is not authenticated"},
    },
    methods=["GET"],
)
@extend_schema(
    summary="Create digest",
    description="Create a new digest for the current user with file upload.",
    request=BaseDigestCreateSerializer,
    responses={
        201: BaseDigestSerializer,
        400: {"description": "Bad request - validation errors or missing file"},
        401: {"description": "User is not authenticated"},
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

        # Handle page_size parameter
        try:
            page_size = int(request.query_params.get("page_size", 10))
        except ValueError:
            return Response(
                "Invalid page_size value. Must be an integer.",
                status=status.HTTP_400_BAD_REQUEST,
            )

        if page_size > 200:
            return Response(
                "page_size cannot be greater than 200.",
                status=status.HTTP_400_BAD_REQUEST,
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
        data = request.data.copy()

        # Use the create serializer for validation
        create_serializer = BaseDigestCreateSerializer(data=data)
        if create_serializer.is_valid():
            # Create the digest and assign the current user
            digest_data = create_serializer.validated_data.copy()
            digest_data.pop("file", None)  # Remove file from digest creation data
            digest_data["user"] = request.user  # Assign the current user

            digest = BaseDigest(**digest_data)
            digest.save()
        else:
            return Response(create_serializer.errors, status=400)

        file = request.FILES.get("file")

        if not file:
            return Response({"detail": "Missing 'file' in request."}, status=400)

        with open(digest.path, "wb+") as destination:
            for chunk in file.chunks():
                destination.write(chunk)

        transaction.on_commit(lambda: start_digest.delay(digest.id))
        return Response(self.get_serializer(digest).data, status=201)

    def delete(self, request):
        """
        Delete a specific digest by ID.
        Requires a query parameter: ?id=<digest_id>
        """
        from entries.tasks import refresh_edges_materialized_view

        digest_id = request.query_params.get("id")
        if not digest_id:
            return Response(
                {"detail": "Missing 'id' query parameter."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if request.user.is_cradle_admin:
            digest = get_object_or_404(BaseDigest, id=digest_id)
        else:
            digest = get_object_or_404(BaseDigest, id=digest_id, user=request.user)

        digest.delete()

        refresh_edges_materialized_view.apply_async(simulate=True)
        return Response(status=status.HTTP_204_NO_CONTENT)
