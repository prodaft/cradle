+++
title = "Users and Access"
date = "2025-03-05T12:55:52+01:00"
draft = false
weight = 2
+++

CRADLE implements an entity-level access control system to manage which entries
and notes users can access. The system is built on a strict permission model
with three access levels.

## Access levels

1. None (default)
   - Cannot view notes referencing the entity.
   - Cannot create notes referencing the entity.

2. Read
   - Can view notes referencing the entity.
   - Cannot create notes referencing the entity.

3. Read-write
   - Can view notes referencing the entity.
   - Can create notes referencing the entity.

## Key rules

1. Note access rule
   A user can view a note only if they have read or read-write access to all
   entities referenced in that note.

2. Default access
   Users are granted none access by default unless higher permissions are
   explicitly assigned.

3. Superuser privileges
   Admins automatically have read-write access to all entities and their
   permissions are not stored in the database.

4. Roles
   - Admin: Full permissions and user management.
   - Manager: Manages system configuration and content, excluding user admin.
   - Entry manager: Manage entry classes and edit entity metadata.
   - User: Base access for creating and viewing notes.

## Access management

1. Admin capabilities
   - Modify access levels for any non-admin user.
   - Cannot modify access levels for other admins.

2. Users with read-write access
   - Can grant access to other users for entities they control.
   - Cannot modify access for admins or users who already have read-write
     access.

3. Access requests
   - Users can request access to entities they cannot view.
   - Users with read-write access receive notifications.

## Artifact visibility cases

```mermaid
flowchart TD
    subgraph Case1 [Case 1: Single Entity, Visible Artifact]
        direction LR
        A1[Campaign Alpha]
        B1[User has READ/READ-WRITE Access]
        C1[Artifact: 203.0.113.45]
        A1 --> B1
        B1 -- "Access OK" --> C1
    end
```

```mermaid
flowchart TD
    subgraph Case2 [Case 2: Two Entities, Hidden Artifact]
        direction LR
        A2[Campaign Beta]
        B2[Threat Actor Omega]
        C2[User has READ on Campaign Beta]
        D2[User has NONE on Threat Actor Omega]
        E2[Artifact: malicious.com]
        A2 --> C2
        B2 --> D2
        D2 -- "Missing Access" --> E2[Artifact Hidden]
    end
```

```mermaid
flowchart TD
    subgraph Case3 [Case 3: Single Entity with Elevated Permissions]
        direction LR
        A3[Malware Delta]
        B3[User has READ-WRITE Access]
        C3[Artifact: SHA256 abcd1234...]
        A3 --> B3
        B3 -- "Access OK" --> C3
    end
```

## Note saving examples

```mermaid
flowchart TD
    subgraph Success [Successful Note Save]
        A[Note references Campaign Alpha]
        B[User has READ Access on Campaign Alpha]
        C[Note Saved Successfully]
        A --> B
        B -- "Access Valid" --> C
    end

    subgraph Failure [Failed Note Save]
        D[Note references Campaign Beta and Threat Actor Omega]
        E[User has READ on Campaign Beta]
        F[User has NONE on Threat Actor Omega]
        G[Note Save Fails]
        D --> E
        D --> F
        F -- "Insufficient Access" --> G
    end
```
