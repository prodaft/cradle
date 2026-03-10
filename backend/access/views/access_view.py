"""Views for listing user and entity access privileges (admin only)."""

from uuid import UUID

from django.db.models import Q
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication

from core.exceptions import CoreErrorCodes
from core.openapi import get_common_error_responses, get_error_responses
from core.pagination import TotalPagesPagination
from entries.exceptions import EntityNotFoundException, EntriesErrorCodes
from entries.models import Entry
from user.exceptions import UserErrorCodes, UserNotFoundException
from user.models import CradleUser, UserRoles
from user.permissions import HasAdminRole

from ..enums import AccessType
from ..models import Access
from ..serializers import AccessEntitySerializer, AccessUserSerializer


@extend_schema_view(
    get=extend_schema(
        operation_id="access_user_retrieve",
        summary="Get user access privileges",
        description="Returns a list of all entities with their access types for a specific user. Only available to admin users.",  # noqa: E501
        parameters=[
            OpenApiParameter(
                name="user_id",
                type=str,
                location=OpenApiParameter.PATH,
                description="UUID of the user to get access privileges for",
            ),
            OpenApiParameter(
                name="page",
                type=int,
                location=OpenApiParameter.QUERY,
                description="Page number",
                required=False,
            ),
            OpenApiParameter(
                name="page_size",
                type=int,
                location=OpenApiParameter.QUERY,
                description="Page size",
                required=False,
            ),
        ],
        responses={
            200: TotalPagesPagination().get_paginated_response_serializer(AccessEntitySerializer),
            **get_error_responses(
                UserErrorCodes.USER_NOT_FOUND,
                CoreErrorCodes.INVALID_PAGE_SIZE,
                CoreErrorCodes.PAGE_SIZE_TOO_LARGE,
            ),
            **get_common_error_responses(),
        },
    )
)
class UserAccessList(ListAPIView):
    """List entities and their access types for a given user (admin only)."""

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, HasAdminRole]
    serializer_class = AccessEntitySerializer
    pagination_class = TotalPagesPagination

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Entry.entities.none()
        user_id = self.kwargs["user_id"]
        try:
            self._access_user = CradleUser.objects.get(id=user_id)
        except CradleUser.DoesNotExist:
            raise UserNotFoundException(detail="There is no user with the specified ID.")
        return Access.objects.get_accesses(self._access_user.id)

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["is_admin"] = getattr(self, "_access_user", None) and self._access_user.is_cradle_admin
        return context


@extend_schema_view(
    get=extend_schema(
        operation_id="access_entity_retrieve",
        summary="Get entity access privileges",
        description="Returns a list of all users with their access types for a specific entity. Only available to admin users.",  # noqa: E501
        parameters=[
            OpenApiParameter(
                name="entity_id",
                type=int,
                location=OpenApiParameter.PATH,
                description="ID of the entity to get access privileges for",
            ),
            OpenApiParameter(
                name="search",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Search users by username or user ID",
                required=False,
            ),
            OpenApiParameter(
                name="page",
                type=int,
                location=OpenApiParameter.QUERY,
                description="Page number",
                required=False,
            ),
            OpenApiParameter(
                name="page_size",
                type=int,
                location=OpenApiParameter.QUERY,
                description="Page size",
                required=False,
            ),
        ],
        responses={
            200: TotalPagesPagination().get_paginated_response_serializer(AccessUserSerializer),
            **get_error_responses(
                EntriesErrorCodes.ENTITY_NOT_FOUND,
                CoreErrorCodes.INVALID_PAGE_SIZE,
                CoreErrorCodes.PAGE_SIZE_TOO_LARGE,
            ),
            **get_common_error_responses(),
        },
    )
)
class EntityAccessList(ListAPIView):
    """List users and their access types for a given entity (admin only)."""

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, HasAdminRole]
    pagination_class = TotalPagesPagination
    serializer_class = AccessUserSerializer

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return []
        entity_id = self.kwargs["entity_id"]
        try:
            entity = Entry.entities.get(pk=entity_id)
        except Entry.DoesNotExist:
            raise EntityNotFoundException(detail="There is no entity with the specified ID.")

        accesses = Access.objects.filter(Q(entity=entity) & ~Q(user__role=UserRoles.ADMIN)).select_related("user")

        none_users = CradleUser.objects.filter(
            ~Q(id__in=accesses.values_list("user_id", flat=True)) & ~Q(role=UserRoles.ADMIN)
        )

        search = self.request.query_params.get("search")
        if search:
            try:
                search_uuid = UUID(search)
            except (ValueError, TypeError):
                search_uuid = None
            search_filter = Q(user__username__icontains=search)
            if search_uuid is not None:
                search_filter |= Q(user__id=search_uuid)
            accesses = accesses.filter(search_filter)
            none_search_filter = Q(username__icontains=search)
            if search_uuid is not None:
                none_search_filter |= Q(id=search_uuid)
            none_users = none_users.filter(none_search_filter)

        combined = [{"user": access.user, "access_type": access.access_type} for access in accesses] + [
            {"user": user, "access_type": AccessType.NONE} for user in none_users
        ]
        return sorted(combined, key=lambda row: (row["user"].username or "").lower())
