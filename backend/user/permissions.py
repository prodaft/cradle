"""Role-based permissions for user, entity, and entry class views."""

from rest_framework.permissions import BasePermission


class HasAdminRole(BasePermission):
    """Allow only users with admin role."""

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_cradle_admin)


class HasManagerRole(BasePermission):
    """Allow users with manager or admin role."""

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_manager)


class EntryClassListPermission(BasePermission):
    """GET: any authenticated user. POST: requires HasManagerRole."""

    message = "You do not have permission to perform this action."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method == "GET":
            return True
        return HasManagerRole().has_permission(request, view)


class EntityListPermission(BasePermission):
    """GET: HasManagerRole. POST: HasAdminRole only."""

    message = "You do not have permission to perform this action."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method == "GET":
            return HasManagerRole().has_permission(request, view)
        if request.method == "POST":
            return HasAdminRole().has_permission(request, view)
        return False


class EntityDetailPermission(BasePermission):
    """GET/PATCH/DELETE: HasManagerRole; DELETE admin check is enforced in the view."""

    message = "You do not have permission to perform this action."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return HasManagerRole().has_permission(request, view)


class EntryClassDetailPermission(BasePermission):
    """GET: any authenticated. DELETE: HasAdminRole. PUT: HasManagerRole."""

    message = "You do not have permission to perform this action."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method == "GET":
            return True
        if request.method == "DELETE":
            return HasAdminRole().has_permission(request, view)
        return HasManagerRole().has_permission(request, view)
