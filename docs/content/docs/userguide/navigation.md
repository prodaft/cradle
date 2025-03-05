+++
date = "2025-03-05T13:00:00+01:00"
draft = false
linkTitle = "Navigating CRADLE"
title = "Navigating CRADLE"
weight = 4
+++

In CRADLE, there are two primary object types: **entries** and **notes**. The platform provides dedicated methods for navigating and searching for each type.

## Searching for Entries

Search for entries using the **Search Bar** located at the top of the page. You can filter your search by:

- **Entry Name:** Simply enter the entry name in the search box.
- **Entry Subtype:** For example, filtering by subtypes like `ipv4`, `email`, or `source`. Checkboxes under each filter are organized hierarchically and merged with a `/`. For instance, selecting the `tg` checkbox under `username` will search for entries of subtype `username/tg`.

### Advanced Search

Advanced search allows users to query by entering custom strings with support for wildcards and literal values. Key features include:

- **String Queries:** Simply type your query into the search bar.
- **Subtype Querying:**
  For example, `name:aartifact` will search for entries with the subtype `name`.
- **Wildcards:**
  Wildcards (`*`) are allowed on both sides of the query string. For instance, `na*:ar*` will match any entries starting with "na" and containing "ar" later in the string.
- **Literal Quoting:**
  When quotes are used, the value is taken literally. This means that special characters, such as colons and asterisks, are not interpreted as part of the query logic.
- **Default Wildcard Behavior:**
  If no subtype is specified, the system assumes a wildcard search.

## Searching for Notes

Notes are searched via the notes page, which presents two text boxes for refining your query:

- **Search by Content:** Locate notes based on their content.
- **Search by Author:** Find notes by filtering according to the author's name.

This search functionality is also integrated into dashboards, allowing you to filter notes linked to specific entities.

---

### Navigation

{{< cards columns = "2" >}}
  {{< card link="/docs/userguide/fleeting" title="Fleeting Notes" icon="arrow-left" >}}
  {{< card link="/docs/userguide/dashboard" title="Dashboard" icon="arrow-right" >}}
{{< /cards >}}
