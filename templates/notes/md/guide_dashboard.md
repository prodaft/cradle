# Dashboards

Dashboards in CRADLE provide a centralized view of all information related to a
specific entry, whether it is an entity or an artifact. Each dashboard displays
basic entry information along with a list of all notes referencing the entry. It
also automatically generates lists of related entities and artifacts from the
note references, divided into three sections:

- **Related Entities:** Entities that are referenced in the notes.
- **Related Artifacts:** Artifacts that are referenced in the notes.
- **Second-Level Entries:** Entries that are a second-hop neighbor of the current entry in the knowledge graph.

The connected entry information is grouped by type to improve loading speeds. Additionally, the dashboard offers easy access to:
1. The graph explorer for the current entry.
2. Publishing View.
3. For admins, deleting an entry.

All of this information is organized hierarchically to simplify navigation. For instance, in the screenshot, you can see that in order to access the relation information for `username/tg`, the user must click through steps **4-5-6** in that order.

![screenshot]({{ static_location }}/images/notes/dashboard_hierarchy.png)

## Requesting Access to an Entry

The dashboard also simplifies the process of requesting access to an entry. If you are analyzing an entry's relationships and see a message stating, "There are inaccessible entities of this type you cannot view. Request access to view them," clicking on the request access text will send a notification to the owner of the inaccessible entry. If the owner approves the request, you will receive a notification, and the entry will then become accessible.
