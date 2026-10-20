"""Team-specific exceptions and error codes."""

from rest_framework import status

from core.exceptions import CradleAPIException, ErrorCode


class TeamErrorCodes(ErrorCode):
    """Error codes for team operations."""

    TEAM_NOT_FOUND = (status.HTTP_404_NOT_FOUND, "Team Not Found", "team-not-found")
    DUPLICATE_TEAM = (status.HTTP_409_CONFLICT, "Duplicate Team", "duplicate-team")
    TEAM_CHANGE_NOT_ALLOWED = (status.HTTP_403_FORBIDDEN, "Team Change Not Allowed", "team-change-not-allowed")
    TEAM_MEMBER_NOT_FOUND = (status.HTTP_404_NOT_FOUND, "Team Member Not Found", "team-member-not-found")
    TEAM_MEMBER_ALREADY_EXISTS = (
        status.HTTP_409_CONFLICT,
        "Team Member Already Exists",
        "team-member-already-exists",
    )
    TEAM_ACCESS_CHANGE_NOT_ALLOWED = (
        status.HTTP_403_FORBIDDEN,
        "Team Access Change Not Allowed",
        "team-access-change-not-allowed",
    )


class TeamNotFoundException(CradleAPIException):
    """Raised when a team does not exist or is not visible to the requester."""

    error_code = TeamErrorCodes.TEAM_NOT_FOUND


class DuplicateTeamException(CradleAPIException):
    """Raised when a team with the same name already exists."""

    error_code = TeamErrorCodes.DUPLICATE_TEAM


class TeamChangeNotAllowedException(CradleAPIException):
    """Raised when the requester may not change a team or its members."""

    error_code = TeamErrorCodes.TEAM_CHANGE_NOT_ALLOWED


class TeamMemberNotFoundException(CradleAPIException):
    """Raised when a user is not a member of the team."""

    error_code = TeamErrorCodes.TEAM_MEMBER_NOT_FOUND


class TeamMemberAlreadyExistsException(CradleAPIException):
    """Raised when adding a user who is already a member of the team."""

    error_code = TeamErrorCodes.TEAM_MEMBER_ALREADY_EXISTS


class TeamAccessChangeNotAllowedException(CradleAPIException):
    """Raised when the requester may not change a team's access to an entity."""

    error_code = TeamErrorCodes.TEAM_ACCESS_CHANGE_NOT_ALLOWED


__all__ = [
    "TeamErrorCodes",
    "TeamNotFoundException",
    "DuplicateTeamException",
    "TeamChangeNotAllowedException",
    "TeamMemberNotFoundException",
    "TeamMemberAlreadyExistsException",
    "TeamAccessChangeNotAllowedException",
]
