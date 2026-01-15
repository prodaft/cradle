+++
title = "Notes and Knowledge Capture"
date = "2025-03-05T12:55:52+01:00"
draft = false
weight = 2
+++

CRADLE notes capture analyst thinking and connect evidence as you write. As you
link entries, CRADLE builds a graph that appears in dashboards and the graph
explorer.

Notes are composed using extended markdown with syntax highlighting and live
preview.

## Note syntax

CRADLE extends standard markdown with features for linking entries.

### Basic markdown support
- Headers (`#`, `##`, `###`)
- Lists (bulleted and numbered)
- Text formatting (bold, italic, strikethrough)
- Code (inline and blocks)
- Links and images
- Tables
- Blockquotes

### Entity and artifact linking
Use double brackets to link entries by subtype:

- `[[subtype:value]]` links to an entry, for example `[[case:PTI-42]]` or
  `[[ip:1.1.1.1]]`.
- `[[subtype:value|alias]]` links to an entry and displays an alias, for
  example `[[ip:1.1.1.1|C2 IP]]`.
- Linking with an alias also creates an `alias` entry in the graph, and the
  original entry is linked to that alias node.
- When adding links in tables, escape the alias separator, for example
  `[[ip:1.1.1.1\|C2 IP]]`.

### Link dates
If you need link dates to remain stable across note edits, add a date suffix
after the link in `(MM-DD-YYYY)` format. CRADLE can add these dates
automatically.

Example: `[[ip:1.1.1.1]] (10-10-1000)`.

### Graph exclusions
Prefix a link with `~` to keep it out of the graph while still mentioning it
in the note.

Example: `~[[domain:example.com]]`.

### Best practices
- Use aliases to improve readability.
- Keep notes concise. CRADLE aggregates them under related entries.
- Save work in progress notes as fleeting notes until ready to finalize.

## Adding and referencing files in notes

CRADLE supports multiple file attachments. Upload size is limited by system
settings and may be overridden per user by an administrator. Storage bucket
size also applies.

Files can be uploaded using the file selection button in the editor or by
pasting from the clipboard. Uploaded files appear in a table below the editor
where you can insert references, copy references, or delete files.

If a file is an image, it renders in the note when you prepend its reference
with an exclamation mark, for example `![image][image.png]`.

## Role of notes in linking entries

Finalizing a note triggers detection of entry links. Links that appear in the
same markdown section are connected to each other in the graph. If a section
contains too many links, CRADLE creates a `virtual` note node and connects all
linked entries to that node instead of creating every pairwise edge. This keeps
the graph from exploding in size. The clustering threshold is configurable by
an administrator.

This graph clustering does not change graph search or discovery algorithms; it
only changes how connections are rendered and stored.

## Fleeting notes

Fleeting notes are temporary drafts that auto-save as you type. They remain
private, are marked as drafts, and can be edited or deleted before finalization.
Fleeting notes support file attachments and sync across devices. Once you click
Save as Final, the note is added to the knowledge graph and becomes searchable.
