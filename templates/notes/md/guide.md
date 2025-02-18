<h1 align="center">
   User Guide for CRADLE
</h1>
<p align="center">
    <img width="200" height="200" src="{{ static_location }}/images/notes/logo.png" alt="Cradle Logo">
</p>

CRADLE is a collaborative note-taking tool designed specifically for cyber threat analysts. It streamlines workflows by helping you manage and organize notes while making it easy to collaborate with other analysts.

With CRADLE, you can:

- **Centralize Information:** Create and share notes that reference specific entities and artifacts of interest.
- **Automatically Link Data:** The tool automatically connects related artifacts and entities mentioned in your notes, making it easier to navigate and understand the context.
- **Visualize Relationships:** Use informative dashboards and graphs to see how entities and artifacts are interconnected.
- **Generate Reports:** Easily generate and export reports based on the information stored in the system.
- **Ensure Security:** Benefit from robust access controls that let administrators and trusted users manage permissions on an entity-by-entity basis.

In essence, CRADLE is built to help threat analysts work together efficiently by centralizing information and providing clear, contextual insights into the data.

## Glossary

- **Entry**: A fundamental unit in CRADLE that represents either an entity or an artifact.
  - **Entity**: A high-level object of investigation (e.g., a case, organization, or campaign).
  - **Artifact**: A specific piece of evidence or indicator (e.g., IP address, domain name, or file hash).

- **Note**: A document containing analysis, observations, or findings related to one or more entries. Notes can be:
  - **Publishable**: Notes marked for inclusion in reports and external sharing.
  - **Non-publishable**: Internal working notes not intended for external distribution.

- **Fleeting Note**: A temporary, quick-capture note that hasn't been formally organized or linked to specific entries.

- **Access Types**: Different levels of permissions users can have for entries:
  - **Admin**: Full system administration privileges
  - **Entry Manager**: Can manage entities and entry types
  - **User**: Standard user with note-writing capabilities

- **Relations**: Connections between different entries, automatically created when entries are referenced in notes.

- **Entry Class**: A category definition for entries that includes:
  - **Type**: Whether the class defines an entity or artifact
  - **Subtype**: The specific classification (e.g., "malware/ransomware" or "ip/v4")
  - **Regex/Options**: Validation rules for artifact values

## How to Use

<ul>
    <li><a href="/notes/guide_notes" data-custom-href="/notes/guide_notes">Note Taking</a></li>
    <li><a href="/notes/guide_graph" data-custom-href="/notes/guide_graph">Graph Explorer</a></li>
    <li><a href="/notes/guide_fleeting" data-custom-href="/notes/guide_fleeting">Fleeting Notes</a></li>
    <li><a href="/notes/guide_navigation" data-custom-href="/notes/guide_navigation">Navigation</a></li>
    <li><a href="/notes/guide_dashboard" data-custom-href="/notes/guide_dashboard">Dashboards</a></li>
    <li><a href="/notes/guide_access" data-custom-href="/notes/guide_access">Access Control</a></li>
    <li><a href="/notes/guide_publishing" data-custom-href="/notes/guide_publishing">Publishing</a></li>
    <li><a href="/notes/guide_notifications" data-custom-href="/notes/guide_notifications">Notifications</a></li>
    <li><a href="/notes/guide_admin" data-custom-href="/notes/guide_admin">Administration</a></li>
</ul>

## Contact Information


<div style="display: flex; justify-content: space-between; margin-top: 20px;">
    <a href="" data-custom-href=""></a>
    <a href="/notes/guide_notes" data-custom-href="/notes/guide_notes">Next →</a>
</div>