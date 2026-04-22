"""NDJSON stream variants of access list endpoints."""

from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema, extend_schema_view
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from core.ndjson import ndjson_streaming_response
from core.openapi import get_common_error_responses, get_error_responses
from entries.exceptions import EntriesErrorCodes
from user.exceptions import UserErrorCodes, UserNotFoundException
from user.models import CradleUser
from user.permissions import HasAdminRole

from ..entity_access_rows import build_entity_access_user_rows
from ..models import Access
from ..serializers import AccessEntitySerializer, AccessUserSerializer


@extend_schema_view(
    get=extend_schema(
        operation_id="access_user_stream",
        summary="Stream user access privileges (NDJSON)",
        description=(
            "Returns all entities and access types for a user as NDJSON (one object per line). "
            "Admin only; same data as the paginated endpoint."
        ),
        parameters=[
            OpenApiParameter(
                name="user_id",
                type=str,
                location=OpenApiParameter.PATH,
                description="UUID of the user",
            ),
        ],
        responses={
            200: OpenApiResponse(
                description="``application/x-ndjson`` body: one JSON object per line (same shape as list items)."
            ),
            **get_error_responses(UserErrorCodes.USER_NOT_FOUND),
            **get_common_error_responses(),
        },
    ),
)
class UserAccessListStreamView(APIView):
    """Stream user→entity access rows as NDJSON."""

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, HasAdminRole]

    def get(self, request: Request, user_id):
        if getattr(self, "swagger_fake_view", False):
            return ndjson_streaming_response(iter(()))

        try:
            access_user = CradleUser.objects.get(id=user_id)
        except CradleUser.DoesNotExist as exc:
            raise UserNotFoundException(detail="That user could not be found.") from exc

        qs = Access.objects.get_accesses(access_user.id)
        context = {"request": request, "is_admin": access_user.is_cradle_admin}
        serializer = AccessEntitySerializer(context=context)

        def rows():
            for row in qs.iterator(chunk_size=200):
                yield serializer.to_representation(row)

        return ndjson_streaming_response(rows())


@extend_schema_view(
    get=extend_schema(
        operation_id="access_entity_stream",
        summary="Stream entity access privileges (NDJSON)",
        description=(
            "Returns all users and access types for an entity as NDJSON (one object per line). "
            "Admin only; same data as the paginated endpoint."
        ),
        parameters=[
            OpenApiParameter(
                name="entity_id",
                type=int,
                location=OpenApiParameter.PATH,
                description="ID of the entity",
            ),
            OpenApiParameter(
                name="search",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Search users by username or user ID",
                required=False,
            ),
        ],
        responses={
            200: OpenApiResponse(
                description="``application/x-ndjson`` body: one JSON object per line (same shape as list items)."
            ),
            **get_error_responses(EntriesErrorCodes.ENTITY_NOT_FOUND),
            **get_common_error_responses(),
        },
    ),
)
class EntityAccessListStreamView(APIView):
    """Stream entity→user access rows as NDJSON."""

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, HasAdminRole]

    def get(self, request: Request, entity_id: int):
        if getattr(self, "swagger_fake_view", False):
            return ndjson_streaming_response(iter(()))

        search = request.query_params.get("search")
        combined = build_entity_access_user_rows(entity_id, search)
        serializer = AccessUserSerializer(context={"request": request})

        def rows():
            for row in combined:
                yield serializer.to_representation(row)

        return ndjson_streaming_response(rows())
