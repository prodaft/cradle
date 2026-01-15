+++
title = "Authentication and Authorization"
date = "2025-03-05T12:55:52+01:00"
draft = false
weight = 3
+++

CRADLE uses an entity-level access control system with three access levels:
none, read, and read-write. Note access requires read or read-write access to
all entities referenced in the note.

## Roles
- Admin: full permissions for all entities and user management.
- Manager: manages system configuration and content, excluding user admin.
- Entry manager: manage entry classes and entity metadata.
- User: base access for creating and viewing notes.
