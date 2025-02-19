# CRADLE Access Control Mechanism

## Overview
CRADLE implements an entity-level access control system that determines what entries and notes users can access. The system is built around three access levels and follows a strict permission model.

## Access Levels
Users can have three types of access to any entity:

1. **NONE** (Default)
   - Cannot view notes referencing the entity
   - Cannot create notes referencing the entity

2. **READ**
   - Can view notes referencing the entity
   - Cannot create notes referencing the entity

3. **READ-WRITE**
   - Can view notes referencing the entity
   - Can create notes referencing the entity

## Key Rules

1. **Note Access Rule**: A user can only view a note if they have access (READ or READ-WRITE) to **all** entities referenced by that note.

2. **Default Access**: By default, users have NONE access to entities unless explicitly granted higher permissions.

3. **Superuser Privileges**: 
   - Superusers (admins) automatically have READ-WRITE access to all entities
   - Their permissions are not stored in the database

4. **Roles:** Additionaly, each user has a role. The role determines what additional actions they can perform within CRADLE:
    - **Admin:** Has all permissions to all entities. They can manage users and their permissions.
    - **Entry Manager:** Can create, read, and update entry classes. They can also edit the metadata entities they have read/write access to.
    - **User:** The base permission level. They can view and write notes for all entities they have access to.

## Access Management

1. **Admin Capabilities**:
   - Admins can modify access levels for any non-admin user
   - Admins cannot modify access levels of other admins

2. **User with READ-WRITE Access**:
   - Can grant access to other users for entities they have READ-WRITE access to
   - Cannot modify access for:
     - Admin users
     - Users who already have READ-WRITE access

3. **Access Requests**:
   - Users can request access to entities they don't have access to
   - All users with READ-WRITE access to the entity receive a notification
   - The request system facilitates permission management

<div style="display: flex; justify-content: space-between; margin-top: 20px;">
    <a href="/notes/guide_dashboard" data-custom-href="/notes/guide_dashboard">← Previous</a>
    <a href="/notes/guide_publishing" data-custom-href="/notes/guide_publishing">Next →</a>
</div>