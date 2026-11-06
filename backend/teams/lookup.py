"""Look up a team by the id in a URL, as seen by the requesting user."""

from uuid import UUID

from user.models import CradleUser

from .exceptions import TeamChangeNotAllowedException, TeamNotFoundException
from .models import Team


def get_visible_team(user: CradleUser, team_id: UUID) -> Team:
    """Return the team if ``user`` may see it; missing and hidden teams both raise TeamNotFoundException."""
    team = Team.objects.visible_to(user).with_member_info(user).filter(pk=team_id).first()
    if team is None:
        raise TeamNotFoundException(detail="That team could not be found.")
    return team


def get_managed_team(user: CradleUser, team_id: UUID) -> Team:
    """Return the team if ``user`` may see and manage it (admins and the team's leads)."""
    team = get_visible_team(user, team_id)
    if not team.can_manage(user):
        raise TeamChangeNotAllowedException(detail="Only admins and the team's leads can change this team.")
    return team
