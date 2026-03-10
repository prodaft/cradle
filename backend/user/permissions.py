"""Role-based permissions for user, entity, and entry class views."""

from rest_framework.permissions import BasePermission

from .models import UserRoles


class HasAdminRole(BasePermission):
    """Allow only users with admin role."""

    def has_permission(self, request, view):
        return bool(request.user and request.user.role == UserRoles.ADMIN)


class HasEntryManagerRole(BasePermission):
    """Allow users with entry manager or admin role."""

    def has_permission(self, request, view):
        return bool(
            request.user and (request.user.role == UserRoles.ENTRY_MANAGER or request.user.role == UserRoles.ADMIN)
        )


class EntryClassListPermission(BasePermission):
    """GET: any authenticated user. POST: requires HasEntryManagerRole."""

    message = "Insufficient permissions."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method == "GET":
            return True
        return HasEntryManagerRole().has_permission(request, view)


class EntityListPermission(BasePermission):
    """GET: HasEntryManagerRole. POST: HasAdminRole only."""

    message = "Insufficient permissions."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method == "GET":
            return HasEntryManagerRole().has_permission(request, view)
        if request.method == "POST":
            return HasAdminRole().has_permission(request, view)
        return False


class EntityDetailPermission(BasePermission):
    """GET/PATCH: HasEntryManagerRole. DELETE: HasAdminRole only."""

    message = "Insufficient permissions."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method == "DELETE":
            return HasAdminRole().has_permission(request, view)
        return HasEntryManagerRole().has_permission(request, view)


class EntryClassDetailPermission(BasePermission):
    """GET: any authenticated. DELETE: HasAdminRole. POST/PATCH: HasEntryManagerRole."""

    message = "Insufficient permissions."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method == "GET":
            return True
        if request.method == "DELETE":
            return HasAdminRole().has_permission(request, view)
        return HasEntryManagerRole().has_permission(request, view)
