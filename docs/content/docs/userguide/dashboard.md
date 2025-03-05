+++
date = "2025-03-05T13:30:00+01:00"
draft = false
linkTitle = "Dashboards"
title = "Dashboards"
weight = 5
+++

Dashboards in CRADLE offer a centralized view of all information related to a specific entry, whether it is an entity or an artifact. Each dashboard presents key details about the entry along with a list of all notes referencing it. Additionally, dashboards automatically generate related lists from note references, divided into three sections:

- **Related Entities:** Entities referenced in the notes.
- **Related Artifacts:** Artifacts referenced in the notes.
- **Second-Level Entries:** Entries that are second-hop neighbors in the knowledge graph.

For optimal performance, connected entry information is grouped by type. The dashboard also provides quick access to:
1. The graph explorer for the current entry.
2. The Publishing View.
3. Entry deletion options (available to admins).

This hierarchical organization simplifies navigation. For example, the screenshot below shows that to access the relation information for `username/tg`, the user must click through steps **4-5-6** sequentially.

![Dashboard Hierarchy](/images/userguide/dashboard_hierarchy.png)

## Requesting Access to an Entry

The dashboard streamlines the process of requesting access to an entry. If you encounter a message such as, "There are inaccessible entities of this type you cannot view. Request access to view them," simply click the request access text. This action will send a notification to the owner of the inaccessible entry. Once approved, you will be notified, and the entry will become accessible.

### Navigation

{{< cards >}}
  {{< card link="/docs/userguide/navigation" title="Navigating CRADLE" icon="arrow-left" >}}
  {{< card link="/docs/userguide/access" title="Requesting Access" icon="arrow-right" >}}
{{< /cards >}}
