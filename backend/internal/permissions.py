from rest_framework.permissions import BasePermission


class IsCollabService(BasePermission):
    def has_permission(self, request, view):
        return isinstance(request.auth, dict) and request.auth.get("service") == "collab"
