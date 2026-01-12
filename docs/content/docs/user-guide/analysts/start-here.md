+++
title = "Start Here"
date = "2025-03-05T12:55:52+01:00"
draft = false
weight = 1
+++

CRADLE is a collaborative threat intelligence platform for analysts. It helps
teams capture findings, link related evidence, and publish reports from a
shared knowledge base.

## Glossary

- Entry
  The core unit within CRADLE, representing either an entity or an artifact.
  - Entity: A high-level object under investigation (case, organization,
    campaign).
  - Artifact: A specific piece of evidence (IP address, domain name, file hash).

- Note
  A document that records analysis, observations, or findings related to one or
  more entries.
  - Publishable note: A finalized note suitable for external sharing and
    reports.
  - Non-publishable note: An internal draft intended for private or team use.

- Fleeting note
  A temporary, auto-saved draft used to capture information quickly. These
  remain private until finalized and linked to entries.

- Access types
  Permission levels that define how users interact with entries:
  - None: No access to view or modify notes.
  - Read: Can view notes referencing the entry.
  - Read-write: Can view and create notes referencing the entry.

- Roles
  Predefined user roles with additional capabilities:
  - Admin: Full system control.
  - Manager: Manages system configuration and content, excluding user admin.
  - Entry manager: Manages entities, entry types, and metadata.
  - User: Standard access for creating and viewing notes.

- Relations
  Automatically generated links between entries when they are referenced in
  notes. These connections form the knowledge graph.

- Entry class
  A categorization system for entries:
  - Type: Entity or artifact.
  - Subtype: A more detailed classification (for example, malware/ransomware or
    ip/v4).
  - Validation rules: Regex patterns or enumerated options.

## Navigation basics
- Use the search bar at the top to find entries.
- Notes are searched from the notes page, by content or author.
- Dashboards are the primary entry detail views.
