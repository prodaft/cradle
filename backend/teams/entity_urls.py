"""Per-entity team access and ownership routes, mounted under /entries/entities/<entity_id>/."""

from django.urls import path

from .views import EntityOwner, EntityTeamAccessList, TeamAccessUpdate

urlpatterns = [
    path("access/teams/", EntityTeamAccessList.as_view(), name="entity_team_access_list"),
    path("access/teams/<uuid:team_id>/", TeamAccessUpdate.as_view(), name="team_access_update"),
    path("owner/", EntityOwner.as_view(), name="entity_owner"),
]
