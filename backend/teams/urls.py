"""URL routing for teams.

Routes:
- "" - List or create teams
- <uuid:team_id>/ - Retrieve, update or delete a team
- <uuid:team_id>/members/ - List or add members
- <uuid:team_id>/candidates/ - List users who can be added to the team
- <uuid:team_id>/members/<uuid:user_id>/ - Change a member's role or remove them
- <uuid:team_id>/access/ - List the team's entity access
- <uuid:team_id>/access/<int:entity_id>/ - Set the team's access to an entity
- entities/<int:entity_id>/ - List teams with access to an entity
- entities/<int:entity_id>/owner/ - Set an entity's owning team
"""

from django.urls import path

from .views import (
    TeamAccessList,
    TeamDetail,
    TeamList,
    TeamMemberCandidates,
    TeamMemberDetail,
    TeamMemberList,
)

urlpatterns = [
    path("", TeamList.as_view(), name="team_list"),
    path("<uuid:team_id>/", TeamDetail.as_view(), name="team_detail"),
    path("<uuid:team_id>/members/", TeamMemberList.as_view(), name="team_member_list"),
    path("<uuid:team_id>/candidates/", TeamMemberCandidates.as_view(), name="team_member_candidates"),
    path("<uuid:team_id>/members/<uuid:user_id>/", TeamMemberDetail.as_view(), name="team_member_detail"),
    path("<uuid:team_id>/access/", TeamAccessList.as_view(), name="team_access_list"),
]
