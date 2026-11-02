"""Team queryset: which teams a user belongs to or may see."""

from django.apps import apps
from django.db import models
from django.db.models import Count, OuterRef, Subquery


class TeamQuerySet(models.QuerySet):
    def member_of(self, user):
        """Return the teams ``user`` belongs to.

        Filters through a membership subquery, so annotations over all members (e.g. member counts) stay intact.
        """
        TeamMembership = apps.get_model("teams", "TeamMembership")
        return self.filter(id__in=TeamMembership.objects.filter(user=user).values("team_id"))

    def visible_to(self, user):
        """Return the teams ``user`` may see: all of them for managers, otherwise the ones they belong to."""
        return self if user.is_manager else self.member_of(user)

    def with_member_info(self, user):
        """Annotate each team with its member count and ``user``'s role in it (None if not a member)."""
        TeamMembership = apps.get_model("teams", "TeamMembership")
        role = TeamMembership.objects.filter(team=OuterRef("pk"), user=user).values("role")[:1]
        return self.annotate(num_members=Count("memberships"), requester_role=Subquery(role))
