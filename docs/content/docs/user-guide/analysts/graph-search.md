+++
title = "Graph and Search"
date = "2025-03-05T12:55:52+01:00"
draft = false
weight = 4
+++

The graph and search tools help you move from a single indicator to the wider
context around it.

## Graph explorer

The graph explorer is a connected view of entries and their relationships.

- **Nodes** are entries (entities and artifacts).
- **Relations** are links created by notes, enrichments, and digests.
- **Virtual edges** are special relations that treat connected nodes as the
  same node for graph traversal and grouping.

### Explore and focus
- Search within the graph to jump to a specific node.
- Expand neighbors to trace related infrastructure or actors.
- Filter by entry subtype to reduce noise.
- Adjust labels and node sizes to keep dense views readable.

### Inspect relationships
- Select a node to see its linked notes, enrichments, and digests.
- Select an edge to view the source that created the relationship.

## Entry search

Use the global search bar to find entries by name or identifier. Subtypes are
hierarchical and use slashes for nesting.

### Query patterns
- `subtype:value` searches a specific subtype (for example, `ip:1.1.1.1`).
- `*` can be used as a wildcard, for example `ip:1.1.*`.
- `"quoted"` text is treated literally with no wildcard behavior.
- A query without `:` searches entry names and entity descriptions.

## Notes search

Search notes from the Notes page or from an entry dashboard.

- Filter by content or author.
- Use entry dashboards to filter notes linked to a specific entry.
