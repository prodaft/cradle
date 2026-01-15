+++
title = "Entry Taxonomy Management"
date = "2025-03-05T12:55:52+01:00"
draft = false
weight = 3
+++

Entry classes define how CRADLE categorizes data. Each entry class includes:

- Type
  Indicates whether the entry is an entity or an artifact.
  - Entity: High-level object of investigation that controls access.
  - Artifact: Evidence accessible to all users.

- Subtype (name)
  A unique category such as email, username, ip, domain, or source.

- Format
  Defines valid input for artifacts:
  - Regex: a regular expression that validates the artifact.
  - Enumerator: a newline-separated list of acceptable values.

- Color
  The color used for the entry in the knowledge graph.

## Type mappings

Type mappings for external systems (for example, Catalyst) are managed
separately from entry classes. Use the admin panel type mappings editor to
configure these integrations.
