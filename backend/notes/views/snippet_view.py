"""Snippet list, create, retrieve, update, delete API views."""

from typing import cast
from uuid import UUID

from django.db import transaction
from django.db.models import Q
from django.urls import reverse
from drf_spectacular.utils import OpenApiResponse, extend_schema, extend_schema_view
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from core.exceptions import CoreErrorCodes, NotFoundException
from core.openapi import get_common_error_responses, get_error_responses
from user.authentication import CookieJWTAuthentication
from user.exceptions import UserErrorCodes
from user.models import CradleUser
from user.utils.lookup import resolve_visible_user

from ..exceptions import NotesErrorCodes, SnippetNotFoundException
from ..models import Snippet
from ..serializers import SnippetSerializer


class _SnippetCollectionView(APIView):
    """Snippets of one owner: a user, or the system (owner ``None``). Subclasses resolve the owner."""

    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def owner(self, request: Request, creating: bool, **kwargs) -> CradleUser | None:
        raise NotImplementedError

    def get(self, request: Request, **kwargs) -> Response:
        owner = self.owner(request, creating=False, **kwargs)
        snippets = Snippet.objects.filter(owner__isnull=True) if owner is None else Snippet.objects.filter(owner=owner)
        return Response(SnippetSerializer(snippets, many=True).data, status=status.HTTP_200_OK)

    def post(self, request: Request, **kwargs) -> Response:
        owner = self.owner(request, creating=True, **kwargs)
        serializer = SnippetSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            serializer.save(owner=owner)
        location = request.build_absolute_uri(reverse("snippet_detail", kwargs={"snippet_id": serializer.instance.id}))
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers={"Location": location})


@extend_schema_view(
    get=extend_schema(
        operation_id="notes_snippets_system_list",
        summary="List system snippets",
        description="Returns the snippets available to every user.",
        responses={200: SnippetSerializer(many=True), **get_common_error_responses()},
    ),
    post=extend_schema(
        operation_id="notes_snippets_system_create",
        summary="Create system snippet",
        description="Creates a snippet available to every user. Admin only.",
        request=SnippetSerializer,
        responses={
            201: SnippetSerializer,
            **get_error_responses(CoreErrorCodes.NOT_FOUND, include_validation_error=True),
            **get_common_error_responses(),
        },
    ),
)
class SystemSnippetsView(_SnippetCollectionView):
    def owner(self, request: Request, creating: bool, **kwargs) -> None:
        if creating and not cast(CradleUser, request.user).is_cradle_admin:
            raise NotFoundException(detail="That resource could not be found.")
        return None


def _user_snippet_schema(prefix: str, whose: str) -> dict:
    return {
        "get": extend_schema(
            operation_id=f"{prefix}_snippets_list",
            summary=f"List {whose} snippets",
            description=f"Returns the snippets owned by {whose}.",
            responses={
                200: SnippetSerializer(many=True),
                **get_error_responses(UserErrorCodes.USER_NOT_FOUND),
                **get_common_error_responses(),
            },
        ),
        "post": extend_schema(
            operation_id=f"{prefix}_snippets_create",
            summary=f"Create snippet for {whose}",
            description=f"Creates a snippet owned by {whose}.",
            request=SnippetSerializer,
            responses={
                201: SnippetSerializer,
                **get_error_responses(UserErrorCodes.USER_NOT_FOUND, include_validation_error=True),
                **get_common_error_responses(),
            },
        ),
    }


@extend_schema_view(**_user_snippet_schema("users", "a user"))
class UserSnippetsView(_SnippetCollectionView):
    def owner(self, request: Request, creating: bool, user_id: str | UUID = "me", **kwargs) -> CradleUser:
        return resolve_visible_user(cast(CradleUser, request.user), user_id)


@extend_schema_view(**_user_snippet_schema("users_me", "the current user"))
class UserMeSnippetsView(UserSnippetsView):
    """Same as UserSnippetsView for /users/me/snippets/, with its own operation ids."""


class AllAccessibleSnippetsListView(APIView):
    """List all snippets accessible to the current user.

    Returns user's own snippets and system snippets (owner is null).
    """

    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAuthenticated]

    @extend_schema(
        operation_id="notes_snippets_list",
        summary="List all accessible snippets",
        description="Returns all snippets accessible to the current user (user's own snippets and system snippets).",
        responses={
            200: SnippetSerializer(many=True),
            **get_common_error_responses(),
        },
    )
    def get(self, request: Request) -> Response:
        """Get all snippets accessible to the current user."""
        user = cast(CradleUser, request.user)
        snippets = Snippet.objects.filter(Q(owner=user) | Q(owner__isnull=True))
        serializer = SnippetSerializer(snippets, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class SnippetDetailView(APIView):
    """Retrieve, update or delete a specific snippet.

    GET: Retrieve. PUT: Full update. PATCH: Partial update. DELETE: Remove.
    """

    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def _get_snippet_and_check_permissions(self, snippet_id, request):
        """Get snippet and check if user has permission to access it."""
        try:
            snippet = Snippet.objects.get(id=snippet_id)
        except Snippet.DoesNotExist:
            raise SnippetNotFoundException(detail="That snippet could not be found.")

        current_user = cast(CradleUser, request.user)

        if not (snippet.owner == current_user or snippet.owner is None or current_user.is_cradle_admin):
            raise SnippetNotFoundException(detail="That snippet could not be found.")

        return snippet

    def _check_modify_permissions(self, snippet, request):
        """Check if user has permission to modify/delete this snippet (404 to avoid revealing)."""
        current_user = cast(CradleUser, request.user)
        if current_user.is_cradle_admin:
            return
        if snippet.owner is None:
            raise SnippetNotFoundException(detail="That snippet could not be found.")
        if snippet.owner != current_user:
            raise SnippetNotFoundException(detail="That snippet could not be found.")

    @extend_schema(
        operation_id="notes_snippets_retrieve",
        summary="Retrieve a snippet",
        description="Get details of a specific snippet by ID.",
        responses={
            200: SnippetSerializer,
            **get_error_responses(NotesErrorCodes.SNIPPET_NOT_FOUND),
            **get_common_error_responses(),
        },
    )
    def get(self, request: Request, snippet_id: UUID) -> Response:
        """Retrieve a specific snippet."""
        snippet = self._get_snippet_and_check_permissions(snippet_id, request)
        serializer = SnippetSerializer(snippet)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        operation_id="notes_snippets_update",
        summary="Update a snippet",
        description="Update a specific snippet by ID.",
        request=SnippetSerializer,
        responses={
            200: SnippetSerializer,
            **get_error_responses(
                NotesErrorCodes.SNIPPET_NOT_FOUND,
                include_validation_error=True,
            ),
            **get_common_error_responses(),
        },
    )
    def put(self, request: Request, snippet_id: UUID) -> Response:
        """Update a specific snippet."""
        snippet = self._get_snippet_and_check_permissions(snippet_id, request)
        self._check_modify_permissions(snippet, request)

        serializer = SnippetSerializer(snippet, data=request.data, partial=False)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        operation_id="notes_snippets_partial_update",
        summary="Partially update a snippet",
        description="Partially update a specific snippet by ID.",
        request=SnippetSerializer,
        responses={
            200: SnippetSerializer,
            **get_error_responses(
                NotesErrorCodes.SNIPPET_NOT_FOUND,
                include_validation_error=True,
            ),
            **get_common_error_responses(),
        },
    )
    def patch(self, request: Request, snippet_id: UUID) -> Response:
        """Partially update a specific snippet."""
        snippet = self._get_snippet_and_check_permissions(snippet_id, request)
        self._check_modify_permissions(snippet, request)

        serializer = SnippetSerializer(snippet, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        operation_id="notes_snippets_destroy",
        summary="Delete a snippet",
        description="Delete a specific snippet by ID.",
        responses={
            204: OpenApiResponse(description="Snippet deleted successfully"),
            **get_error_responses(NotesErrorCodes.SNIPPET_NOT_FOUND),
            **get_common_error_responses(),
        },
    )
    def delete(self, request: Request, snippet_id: UUID) -> Response:
        """Delete a specific snippet."""
        snippet = self._get_snippet_and_check_permissions(snippet_id, request)
        self._check_modify_permissions(snippet, request)

        with transaction.atomic():
            snippet.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
