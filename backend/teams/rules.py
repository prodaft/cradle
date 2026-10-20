"""Who may grant access to entities, to teams or to individual users.

- Admins may grant anything.
- An entity with an owning team: only that team's leads may grant access to it, to any team or
  user, and never above their own access to the entity.
- An entity without an owning team: a team's leads may grant their own team access, up to their
  own level; any manager may grant users direct access (the behaviour before teams existed).

Leads need not be managers, so a lead's own level is a real limit: a lead without the manager role
cannot raise their own access.
"""

from access.enums import ACCESS_RANK, AccessType
from access.models import Access
from entries.models import Entry
from user.models import CradleUser

from .models import Team


def _within_own_level(user: CradleUser, entity: Entry, access_type: AccessType) -> bool:
    """Whether ``access_type`` is no stronger than the access ``user`` has to ``entity``."""
    own = Access.objects.effective_access_type(user, entity)
    return ACCESS_RANK[AccessType(access_type)] <= ACCESS_RANK[own]


def leads_owning_team(user: CradleUser, entity: Entry) -> bool:
    """Whether ``user`` leads the team that owns ``entity``."""
    return entity.team_id is not None and entity.team.is_lead(user)


def can_set_team_access(user: CradleUser, team: Team, entity: Entry, access_type: AccessType) -> bool:
    """Whether ``user`` may set ``team``'s access to ``entity`` to ``access_type``."""
    if user.is_cradle_admin:
        return True
    if entity.team_id is not None:
        allowed = leads_owning_team(user, entity)
    else:
        allowed = team.is_lead(user)
    return allowed and _within_own_level(user, entity, access_type)


def can_set_user_access(user: CradleUser, target: CradleUser, entity: Entry, access_type: AccessType) -> bool:
    """Whether ``user`` may set ``target``'s direct access to ``entity`` to ``access_type``."""
    if target.is_cradle_admin:
        return False
    if user.is_cradle_admin:
        return True
    if entity.team_id is None:
        return user.is_manager
    return leads_owning_team(user, entity) and _within_own_level(user, entity, access_type)


def access_request_recipients(entity: Entry):
    """Users notified when someone asks for access to ``entity``.

    Leads of the owning team (admins if it has no leads); admins and managers for unowned entities.
    """
    if entity.team_id is not None:
        leads = entity.team.leads()
        if leads.exists():
            return leads
        return CradleUser.objects.admins()
    return CradleUser.objects.managers()
