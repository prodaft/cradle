+++
title = "Graph and Search"
date = "2025-03-05T12:55:52+01:00"
draft = false
weight = 4
+++

## Graph explorer
The graph explorer visualizes relationships between entries.

- Nodes represent entities and artifacts.
- Edges represent relationships established through notes.

### Querying and filters

- Use the search field to focus on specific nodes.
- Filter by entry types to reduce visual noise.
- Use display controls to adjust node size and label visibility.

### Viewing and browsing

- The graph view displays nodes and edges and lets you explore neighbors.
- Clicking an edge reveals the notes that established the relationship.
- The legend can be toggled to show or hide node categories.

## Searching for entries

Use the search bar at the top of the page. You can filter by entry name or
entry subtype. Subtypes are hierarchical and use slashes for nesting.

### Advanced search

- String queries: type a query into the search bar.
- Subtype querying: ip:1.1.1.1 searches for subtype ip with value.
- Wildcards: use * on either side, for example ip:1.1.*.
- Literal quoting: quotes treat characters literally (no wildcard behavior).
- No subtype: a query without a colon searches the entry name and entity
  descriptions.

## Searching for notes

Notes are searched from the notes page using two fields:

- Search by content
- Search by author

This search is also available in dashboards to filter notes linked to a
specific entry.
