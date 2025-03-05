+++
date = '2025-03-05T12:55:52+01:00'
draft = false
linkTitle = 'User Guide'
title = 'User Guide'
+++

Welcome to your comprehensive resource for mastering **CRADLE**—the
collaborative threat intelligence platform designed to streamline your analysis
workflows. This guide will walk you through every aspect of the application,
from crafting insightful notes and visualizing complex relationships to
managing access controls and generating detailed reports.

## Glossary
- **Entry**
  The fundamental unit in CRADLE representing either an entity or an artifact.
  - **Entity:** A high-level object under investigation (e.g., a case, organization, or campaign).
  - **Artifact:** A specific piece of evidence or indicator (e.g., an IP address, domain name, or file hash).

- **Note**
  A document that contains analysis, observations, or findings related to one or more entries.
  - **Publishable Note:** A finalized note ready for external sharing and inclusion in reports.
  - **Non-publishable Note:** An internal working note intended only for private or team use.

- **Fleeting Note**
  A temporary, auto-saved draft used to quickly capture information. Fleeting notes remain private until they are finalized and linked to specific entries.

- **Access Types**
  The permission levels that determine how users can interact with entries:
  - **None:** No access to view or modify notes.
  - **Read:** Permission to view notes referencing the entry.
  - **Read-Write:** Permission to view and create notes referencing the entry.

- **Roles**
  Predefined user roles in CRADLE that dictate additional capabilities:
  - **Admin:** Full system control, including user and permission management.
  - **Entry Manager:** Authority to manage entities, entry types, and related metadata.
  - **User:** Standard access for creating and viewing notes.

- **Relations**
  Automatic links created between entries when they are referenced in notes. These connections form a comprehensive knowledge graph of your data.

- **Entry Class**
  A categorization framework for entries, defining:
  - **Type:** Indicates if the entry is an entity or an artifact.
  - **Subtype:** Specifies the classification (e.g., "malware/ransomware" or "ip/v4").
  - **Validation Rules:** Includes regex patterns or enumerated options to ensure data integrity.

Feel free to refer back to this glossary whenever you encounter new terms throughout the CRADLE documentation.
