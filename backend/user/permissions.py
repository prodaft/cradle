from rest_framework.permissions import BasePermission
from .models import UserRoles


class IsActive(BasePermission):
    message = "User is not active."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_active)


class IsEmailConfirmed(BasePermission):
    message = "User's email is not confirmed."

    def has_permission(self, request, view):
        return bool(request.user and request.user.email_confirmed)


class HasAdminRole(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.role == UserRoles.ADMIN)


class HasEntryManagerRole(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and (
                request.user.role == UserRoles.ENTRY_MANAGER
                or request.user.role == UserRoles.ADMIN
            )
        )
