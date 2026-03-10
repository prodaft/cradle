"""Snippet list, create, retrieve, update, delete API views."""

from typing import cast
from uuid import UUID

from django.db import transaction
from django.db.models import Q
from django.urls import reverse
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from core.exceptions import CoreErrorCodes, CradleAPIException
from core.openapi import get_common_error_responses, get_error_responses
from user.exceptions import UserErrorCodes, UserNotFoundException
from user.models import CradleUser, UserRoles

from ..exceptions import NotesErrorCodes, SnippetNotFoundException
from ..models import Snippet
from ..serializers import SnippetSerializer


def _is_admin(user: CradleUser) -> bool:
    """Check if the user is an admin."""
    return user.role == UserRoles.ADMIN


class UserSnippetsListCreateView(APIView):
    """List and create snippets for a user or system-wide.

    GET: Snippets for user_id ('null'=system, 'me'=current user, or UUID).
    POST: Create snippet for user_id.
    """

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    @extend_schema(
        operation_id="notes_snippets_user_list",
        summary="List snippets for user or system",
        description="Returns all snippets owned by the specified user. Use 'null' for system snippets, 'me' for current user.",
        parameters=[
            OpenApiParameter(
                name="user_id",
                type=OpenApiTypes.STR,
                location=OpenApiParameter.PATH,
                description='User ID: "null" (system), "me" (current user), or UUID.',
                required=True,
            )
        ],
        responses={
            200: SnippetSerializer(many=True),
            **get_error_responses(UserErrorCodes.USER_NOT_FOUND),
            **get_common_error_responses(),
        },
    )
    def get(self, request: Request, user_id: str) -> Response:
        """Get snippets for a specific user or system snippets."""
        current_user = cast(CradleUser, request.user)

        if user_id == "null":
            # Return system snippets (owner is null)
            snippets = Snippet.objects.filter(owner__isnull=True)
        elif user_id == "me":
            snippets = Snippet.objects.filter(owner=current_user)
        else:
            try:
                target_user = CradleUser.objects.get(id=user_id)
            except (CradleUser.DoesNotExist, ValueError, TypeError):
                raise UserNotFoundException(detail="There is no user with the specified ID.")

            # Check permissions (404 to avoid revealing user exists)
            if not (current_user.pk == target_user.pk or _is_admin(current_user)):
                raise UserNotFoundException(detail="There is no user with the specified ID.")

            snippets = Snippet.objects.filter(owner=target_user)

        serializer = SnippetSerializer(snippets, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        operation_id="notes_snippets_user_create",
        summary="Create snippet for user or system",
        description="Creates a new snippet for the specified user. Use 'null' for system snippets, 'me' for current user.",
        parameters=[
            OpenApiParameter(
                name="user_id",
                type=OpenApiTypes.STR,
                location=OpenApiParameter.PATH,
                description='User ID: "null" (system), "me" (current user), or UUID.',
                required=True,
            )
        ],
        request=SnippetSerializer,
        responses={
            201: SnippetSerializer,
            **get_error_responses(
                UserErrorCodes.USER_NOT_FOUND,
                CoreErrorCodes.NOT_FOUND,
                include_validation_error=True,
            ),
            **get_common_error_responses(),
        },
    )
    def post(self, request: Request, user_id: str) -> Response:
        """Create a snippet for a specific user or system snippet."""
        current_user = cast(CradleUser, request.user)

        if user_id == "null":
            # Create system snippet - requires admin privileges (404 to avoid revealing)
            if not _is_admin(current_user):
                raise CradleAPIException(detail="Not found.", error_code=CoreErrorCodes.NOT_FOUND)
            target_owner = None
        elif user_id == "me":
            target_owner = current_user
        else:
            try:
                target_owner = CradleUser.objects.get(id=user_id)
            except (CradleUser.DoesNotExist, ValueError, TypeError):
                raise UserNotFoundException(detail="There is no user with the specified ID.")

            # Check permissions (404 to avoid revealing user exists)
            if current_user.pk != target_owner.pk and not _is_admin(current_user):
                raise UserNotFoundException(detail="There is no user with the specified ID.")

        serializer = SnippetSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            serializer.save(owner=target_owner)
        location = request.build_absolute_uri(reverse("snippet_detail", kwargs={"snippet_id": serializer.instance.id}))
        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED,
            headers={"Location": location},
        )


class AllAccessibleSnippetsListView(APIView):
    """List all snippets accessible to the current user.

    Returns user's own snippets and system snippets (owner is null).
    """

    authentication_classes = [JWTAuthentication]
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

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def _get_snippet_and_check_permissions(self, snippet_id, request):
        """Get snippet and check if user has permission to access it."""
        try:
            snippet = Snippet.objects.get(id=snippet_id)
        except Snippet.DoesNotExist:
            raise SnippetNotFoundException(detail="Snippet not found.")

        current_user = cast(CradleUser, request.user)

        # Check if user has permission to access this snippet (404 to avoid revealing snippet exists)
        # Users can access their own snippets and system snippets (owner=null)
        # Admins can access any snippet
        if not (snippet.owner == current_user or snippet.owner is None or _is_admin(current_user)):
            raise SnippetNotFoundException(detail="Snippet not found.")

        return snippet

    def _check_modify_permissions(self, snippet, request):
        """Check if user has permission to modify/delete this snippet (404 to avoid revealing)."""
        current_user = cast(CradleUser, request.user)
        if _is_admin(current_user):
            return
        if snippet.owner is None:
            raise SnippetNotFoundException(detail="Snippet not found.")
        if snippet.owner != current_user:
            raise SnippetNotFoundException(detail="Snippet not found.")

    @extend_schema(
        operation_id="notes_snippets_retrieve",
        summary="Retrieve a snippet",
        description="Get details of a specific snippet by ID.",
        parameters=[
            OpenApiParameter(
                name="snippet_id",
                type=UUID,
                location=OpenApiParameter.PATH,
                description="UUID of the snippet to retrieve.",
                required=True,
            )
        ],
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
        parameters=[
            OpenApiParameter(
                name="snippet_id",
                type=UUID,
                location=OpenApiParameter.PATH,
                description="UUID of the snippet to update.",
                required=True,
            )
        ],
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
        parameters=[
            OpenApiParameter(
                name="snippet_id",
                type=UUID,
                location=OpenApiParameter.PATH,
                description="UUID of the snippet to partially update.",
                required=True,
            )
        ],
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
        parameters=[
            OpenApiParameter(
                name="snippet_id",
                type=UUID,
                location=OpenApiParameter.PATH,
                description="UUID of the snippet to delete.",
                required=True,
            )
        ],
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
