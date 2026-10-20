"""DRF permissions that let team leads into views otherwise limited to managers."""

from rest_framework.permissions import BasePermission

from entries.models import Entry

from .rules import leads_owning_team


class CanViewEntityAccess(BasePermission):
    """Managers, and leads of the owning team of the entity in the URL (``entity_id``)."""

    message = "You do not have permission to perform this action."

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_manager:
            return True
        entity = Entry.entities.select_related("team").filter(pk=view.kwargs.get("entity_id")).first()
        return entity is not None and leads_owning_team(user, entity)
