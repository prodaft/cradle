from rest_framework import status
from rest_framework.views import APIView
from typing import cast
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiResponse, OpenApiParameter
from drf_spectacular.types import OpenApiTypes

from django.db.models import Q

from ..models import Snippet
from ..serializers import SnippetSerializer
from user.models import UserRoles, CradleUser


class UserSnippetsListCreateView(APIView):
    """
    List and create snippets for a specific user or system-wide snippets.
    GET: Returns all snippets owned by the specified user (or system snippets if user_id is 'null')
    POST: Creates a new snippet for the specified user (or system snippet if user_id is 'null')
    """

    permission_classes = [IsAuthenticated]

    def _is_admin(self):
        """Check if the current user is an admin"""
        return self.request.user.role == UserRoles.ADMIN

    @extend_schema(
        summary="List snippets for user or system",
        description="Returns all snippets owned by the specified user. Use 'null' as user_id for system snippets.",
        parameters=[
            OpenApiParameter(
                name="user_id",
                type=OpenApiTypes.STR,
                location=OpenApiParameter.PATH,
                description='User ID to fetch snippets for, or "null" for system snippets.',
                required=True,
            )
        ],
        responses={
            200: SnippetSerializer(many=True),
            403: OpenApiResponse(description="Permission denied"),
            404: OpenApiResponse(description="User not found"),
        },
    )
    def get(self, request, user_id):
        """Get snippets for a specific user or system snippets"""
        current_user = cast(CradleUser, request.user)

        if user_id == "null":
            # Return system snippets (owner is null)
            snippets = Snippet.objects.filter(owner__isnull=True)
        elif user_id == "me":
            snippets = Snippet.objects.filter(owner=current_user)
        else:
            try:
                target_user = CradleUser.objects.get(id=user_id)
            except CradleUser.DoesNotExist:
                return Response(
                    {"detail": "User not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            # Check permissions
            if not (current_user.pk == target_user.pk or self._is_admin()):
                return Response(
                    {"detail": "You are not allowed to fetch this user's snippets."},
                    status=status.HTTP_403_FORBIDDEN,
                )

            snippets = Snippet.objects.filter(owner=target_user)

        serializer = SnippetSerializer(snippets, many=True)
        return Response(serializer.data)

    @extend_schema(
        summary="Create snippet for user or system",
        description="Creates a new snippet for the specified user. Use 'null' as user_id for system snippets.",
        parameters=[
            OpenApiParameter(
                name="user_id",
                type=OpenApiTypes.STR,
                location=OpenApiParameter.PATH,
                description='User ID to create snippet for, or "null" for system snippets.',
                required=True,
            )
        ],
        request=SnippetSerializer,
        responses={
            201: SnippetSerializer,
            400: OpenApiResponse(description="Invalid data provided"),
            403: OpenApiResponse(description="Permission denied"),
            404: OpenApiResponse(description="User not found"),
        },
    )
    def post(self, request, user_id):
        """Create a snippet for a specific user or system snippet"""
        current_user = cast(CradleUser, request.user)

        if user_id == "null":
            # Create system snippet - requires admin privileges
            if not self._is_admin():
                return Response(
                    {"detail": "Only administrators can create system snippets."},
                    status=status.HTTP_403_FORBIDDEN,
                )
            target_owner = None
        elif user_id == "me":
            target_owner = current_user
        else:
            try:
                target_owner = CradleUser.objects.get(id=user_id)
            except CradleUser.DoesNotExist:
                return Response(
                    {"detail": "User not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            # Check permissions - users can only create snippets for themselves unless admin
            if current_user.pk != target_owner.pk and not self._is_admin():
                return Response(
                    {"detail": "You can only create snippets for yourself."},
                    status=status.HTTP_403_FORBIDDEN,
                )

        serializer = SnippetSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(owner=target_owner)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AllAccessibleSnippetsListView(APIView):
    """
    List all snippets accessible to the current user.
    Returns user's own snippets and system snippets (owner is null).
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="List all accessible snippets",
        description="Returns all snippets accessible to the current user (user's own snippets and system snippets).",
        responses={200: SnippetSerializer(many=True)},
    )
    def get(self, request):
        """Get all snippets accessible to the current user"""
        user = request.user
        snippets = Snippet.objects.filter(Q(owner=user) | Q(owner__isnull=True))
        serializer = SnippetSerializer(snippets, many=True)
        return Response(serializer.data)


class SnippetDetailView(APIView):
    """
    Retrieve, update or delete a specific snippet.
    GET: Retrieve a snippet
    PUT: Update a snippet
    DELETE: Delete a snippet
    """

    permission_classes = [IsAuthenticated]

    def _is_admin(self):
        """Check if the current user is an admin"""
        return self.request.user.role == UserRoles.ADMIN

    def _get_snippet_and_check_permissions(self, snippet_id, request):
        """Get snippet and check if user has permission to access it"""
        try:
            snippet = Snippet.objects.get(id=snippet_id)
        except Snippet.DoesNotExist:
            return None, Response(
                {"detail": "Snippet not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        current_user = cast(CradleUser, request.user)

        # Check if user has permission to access this snippet
        # Users can access their own snippets and system snippets (owner=null)
        # Admins can access any snippet
        if not (
            snippet.owner == current_user or snippet.owner is None or self._is_admin()
        ):
            return None, Response(
                {"detail": "You don't have permission to access this snippet."},
                status=status.HTTP_403_FORBIDDEN,
            )

        return snippet, None

    def _check_modify_permissions(self, snippet, request):
        """Check if user has permission to modify/delete this snippet"""
        current_user = cast(CradleUser, request.user)

        # For system snippets (owner=null), only admins can modify/delete
        if snippet.owner is None and not self._is_admin():
            return Response(
                {"detail": "Only administrators can modify system snippets."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # For user snippets, only the owner or admin can modify/delete
        if (
            snippet.owner is not None
            and snippet.owner != current_user
            and (snippet.owner.is_admin() or not self._is_admin())
        ):
            return Response(
                {"detail": "You can only modify your own snippets."},
                status=status.HTTP_403_FORBIDDEN,
            )

        return None

    @extend_schema(
        summary="Retrieve a snippet",
        description="Get details of a specific snippet by ID.",
        parameters=[
            OpenApiParameter(
                name="snippet_id",
                type=OpenApiTypes.STR,
                location=OpenApiParameter.PATH,
                description="ID of the snippet to retrieve.",
                required=True,
            )
        ],
        responses={
            200: SnippetSerializer,
            403: OpenApiResponse(description="Permission denied"),
            404: OpenApiResponse(description="Snippet not found"),
        },
    )
    def get(self, request, snippet_id):
        """Retrieve a specific snippet"""
        snippet, error_response = self._get_snippet_and_check_permissions(
            snippet_id, request
        )
        if error_response:
            return error_response

        serializer = SnippetSerializer(snippet)
        return Response(serializer.data)

    @extend_schema(
        summary="Update a snippet",
        description="Update a specific snippet by ID.",
        parameters=[
            OpenApiParameter(
                name="snippet_id",
                type=OpenApiTypes.STR,
                location=OpenApiParameter.PATH,
                description="ID of the snippet to update.",
                required=True,
            )
        ],
        request=SnippetSerializer,
        responses={
            200: SnippetSerializer,
            400: OpenApiResponse(description="Invalid data provided"),
            403: OpenApiResponse(description="Permission denied"),
            404: OpenApiResponse(description="Snippet not found"),
        },
    )
    def put(self, request, snippet_id):
        """Update a specific snippet"""
        snippet, error_response = self._get_snippet_and_check_permissions(
            snippet_id, request
        )
        if error_response:
            return error_response

        # Check modify permissions
        modify_error = self._check_modify_permissions(snippet, request)
        if modify_error:
            return modify_error

        serializer = SnippetSerializer(snippet, data=request.data, partial=False)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        summary="Partially update a snippet",
        description="Partially update a specific snippet by ID.",
        parameters=[
            OpenApiParameter(
                name="snippet_id",
                type=OpenApiTypes.STR,
                location=OpenApiParameter.PATH,
                description="ID of the snippet to update.",
                required=True,
            )
        ],
        request=SnippetSerializer,
        responses={
            200: SnippetSerializer,
            400: OpenApiResponse(description="Invalid data provided"),
            403: OpenApiResponse(description="Permission denied"),
            404: OpenApiResponse(description="Snippet not found"),
        },
    )
    def patch(self, request, snippet_id):
        """Partially update a specific snippet"""
        snippet, error_response = self._get_snippet_and_check_permissions(
            snippet_id, request
        )
        if error_response:
            return error_response

        # Check modify permissions
        modify_error = self._check_modify_permissions(snippet, request)
        if modify_error:
            return modify_error

        serializer = SnippetSerializer(snippet, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        summary="Delete a snippet",
        description="Delete a specific snippet by ID.",
        parameters=[
            OpenApiParameter(
                name="snippet_id",
                type=OpenApiTypes.STR,
                location=OpenApiParameter.PATH,
                description="ID of the snippet to delete.",
                required=True,
            )
        ],
        responses={
            204: OpenApiResponse(description="Snippet deleted successfully"),
            403: OpenApiResponse(description="Permission denied"),
            404: OpenApiResponse(description="Snippet not found"),
        },
    )
    def delete(self, request, snippet_id):
        """Delete a specific snippet"""
        snippet, error_response = self._get_snippet_and_check_permissions(
            snippet_id, request
        )
        if error_response:
            return error_response

        # Check modify permissions
        modify_error = self._check_modify_permissions(snippet, request)
        if modify_error:
            return modify_error

        snippet.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
