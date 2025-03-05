+++
date = '2025-03-05T12:55:52+01:00'
draft = false
linkTitle = 'User Guide'
title = 'User Guide'
+++

Welcome to your comprehensive resource for mastering **CRADLE**—the collaborative threat intelligence platform designed to streamline your analytical workflows. This guide covers every aspect of the application, from crafting insightful notes and visualizing complex relationships to managing access controls and generating detailed reports.

{{< callout type="info" >}}
For a quick refresher on key terms as you navigate the documentation, please refer to the glossary below.
{{< /callout >}}

## Glossary

- **Entry**
  The core unit within CRADLE, representing either an entity or an artifact.
  - **Entity:** A high-level object under investigation (such as a case, organization, or campaign).
  - **Artifact:** A specific piece of evidence or indicator (like an IP address, domain name, or file hash).

- **Note**
  A document that records analysis, observations, or findings related to one or more entries.
  - **Publishable Note:** A finalized note that is suitable for external sharing and inclusion in reports.
  - **Non-publishable Note:** An internal draft intended solely for private or team use.

- **Fleeting Note**
  A temporary, auto-saved draft used to quickly capture information. These remain private until finalized and linked to specific entries.

- **Access Types**
  Permission levels that define how users interact with entries:
  - **None:** No access to view or modify notes.
  - **Read:** Permission to view notes that reference the entry.
  - **Read-Write:** Permission to both view and create notes referencing the entry.

- **Roles**
  Predefined user roles within CRADLE that govern additional capabilities:
  - **Admin:** Complete system control, including user and permission management.
  - **Entry Manager:** Authority to manage entities, entry types, and associated metadata.
  - **User:** Standard access for creating and viewing notes.

- **Relations**
  Automatically generated links between entries when they are referenced in notes. These connections help form a comprehensive knowledge graph of your data.

- **Entry Class**
  A categorization system for entries, which includes:
  - **Type:** Indicates whether an entry is an entity or an artifact.
  - **Subtype:** Specifies a more detailed classification (for example, "malware/ransomware" or "ip/v4").
  - **Validation Rules:** Utilizes regex patterns or enumerated options to maintain data integrity.

{{< callout type="info" >}}
Refer back to this glossary whenever you encounter new terminology in the CRADLE documentation. This will help ensure that you fully understand the concepts and how they interconnect.
{{< /callout >}}
