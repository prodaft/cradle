+++
title = "Start Here"
date = "2025-03-05T12:55:52+01:00"
draft = false
weight = 1
+++

CRADLE is a collaborative threat intelligence platform for analysts. It helps
teams capture findings, connect related evidence, and publish reports from a
shared knowledge base. Use it to turn scattered indicators and notes into a
traceable investigation record that your team can reuse and build on.

## What you work with

- **Entry classes** keep data consistent:
  - **Type**: Entity or artifact.
  - **Subtype**: A more specific label (for example, `malware/ransomware` or
    `ip/v4`).
  - **Validation**: Rules like regex patterns or fixed option lists.

- **Entries** are the building blocks of CRADLE. Each entry is either:
  - **Entity**: A high-level object under investigation (case, organization,
    campaign).
  - **Artifact**: A specific piece of evidence (IP address, domain name, file
    hash).

- **Notes** capture your analysis and link it to one or more entries.
  - **Fleeting notes** are auto-saved drafts for quick capture. They stay
    private until you finalize them and link entries.

- **Enrichment** pulls in external context to expand an entry with related
  indicators, metadata, or classifications.

- **Digests** are curated summaries that group related findings and link them
  back to the underlying entries.

- **Graph** is the connected view of all your entries and evidence in CRADLE.
  - **Nodes** are the entries themselves (entities and artifacts).
  - **Relations** are the links between nodes, created by references in notes,
    enrichments, or digests.

## Navigation basics
- Use the global search to find entries by name or identifier.
- Search notes from the Notes page by content, author, or linked entries.
- Open an entry dashboard to review its notes, graph connections, and context.
