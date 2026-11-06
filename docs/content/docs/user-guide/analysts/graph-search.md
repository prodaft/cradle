+++
title = "Graph and Search"
date = "2025-03-05T12:55:52+01:00"
draft = false
weight = 4
+++

The graph and search tools help you move from a single indicator to the wider
context around it. The graph is central to CRADLE's operation, and all data is
stored in the graph. Nodes directly correlate with objects in CRADLE,
including entities, enrichment requests, and digests. Edges capture the
connections an entity has with everything else, which is why the graph is the
primary way to understand context and navigate evidence.

## Graph explorer

The graph explorer is a connected view of entries and their relationships.

Nodes are entries (entities and artifacts). Relations are links created by
notes, enrichments, and digests. Virtual edges are special relations that
treat connected nodes as the same node for graph traversal and grouping.

### Explore and focus
Search within the graph to jump to a specific node, expand neighbors to trace
related infrastructure or actors, and filter by entry subtype to reduce noise.
Filtering also hides nodes left without any visible link. Each entity sits in
the middle of its own area, with the entries around it on rings by how many
links away they are; the layout is redone whenever the filter changes, and the
play button loosens it with a force simulation. Hover a node to see
its name. On large graphs, nodes grow as you zoom in, like places on a map, so
zoom into a cluster to tell its nodes apart.

### Inspect relationships
Select a node to open it in the Explorer panel, which lists its connections
grouped by type. **Focus** zooms the graph to the node and **Open** goes to its
dashboard, or to the note for note entries. Select an edge to see both of its
nodes; on graphs with 5,000 links or more, edges can't be selected, to keep the
graph responsive.

## Entry search

Use the global search bar to find entries by name or identifier. Subtypes
are hierarchical and use slashes for nesting.

### Query patterns
Use `subtype:value` to search a specific subtype (for example, `ip:1.1.1.1`).
Use `*` as a wildcard (for example, `ip:1.1.*`). Quoted text is treated
literally with no wildcard behavior. A query without `:` searches entry names
and entity descriptions.

## Notes search

Search notes from the Notes page or from an entry dashboard.

You can filter by content or author, and use entry dashboards to filter notes
linked to a specific entry.
