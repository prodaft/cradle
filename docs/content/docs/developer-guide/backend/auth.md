+++
title = "Authentication and Authorization"
date = "2025-03-05T12:55:52+01:00"
draft = false
weight = 3
+++

CRADLE uses an entity-level access control system with three access levels:
`none`, `read`, and `read-write`. Note access requires `read` or `read-write`
access to all entities referenced in the note.

## Roles
- **Admin** has full permissions for all entities and user management.
- **Manager** manages entry classes and entity metadata, and grants access to
  entities without an owning team (as do admins).
- **User** provides base access for creating and viewing notes.

## Teams

Access comes from two sources: direct grants (`access.Access`, one row per
user and entity) and team grants (`teams.TeamAccess`, one row per team and
entity, applied to every `teams.TeamMembership`). A user's effective access is
the strongest of the two; public entities are always readable.

All checks go through `AccessManager` (`access/managers.py`), whose
`granted_entity_ids` unions both sources, and through
`CradleUser._compute_access_bitmask`, which builds the user's access vector
from the same set. Notes and relations store only entity bits, so changing a
membership or a team grant takes effect immediately, with no note
recomputation.

Who may grant what is decided in `teams/rules.py`: leads of an entity's
owning `team` control access to owned entities (up to their own access level),
and team leads grant their own team access to unowned entities. Any user can
lead a team; leads also create entities owned by their team (`team_id` on
`POST /entries/entities/`, checked in `EntitySerializer`). Anyone who can read an
entity can fetch it (`GET /entries/entities/<id>/`); `teams/permissions.py` lets
owning-team leads read its access lists, which are otherwise manager-only.

## Sessions and revocation

Signing in creates a `user.UserSession` row and a JWT pair in HttpOnly cookies. Both tokens carry the
session's id in a `sid` claim, which survives refresh-token rotation: refreshing updates the row in place.
Cookie authentication (`CookieJWTAuthentication`) and the WebSocket handshake (`websocket_session`) accept an
access token only while its session row exists, so ending a session takes effect at once rather than when the
30-minute access token expires.

Every way of ending a session deletes its row: logout, revoking a session, changing or resetting a password,
an admin setting a password, simulating a user (for the admin's own session), and deactivating an account.
Deleting a row signals the session's open WebSockets (`user/signals.py`), which close with code 4401;
sockets also close when the access token they were opened with expires. The client then refreshes its token
and reconnects, or signs in again if the session is gone. Use `user.revoke_sessions()` to end sessions, and
`user.testing.login_tokens()` for session-bound tokens in tests.
